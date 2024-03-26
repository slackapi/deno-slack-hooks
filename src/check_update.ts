import {
  DENO_SLACK_API,
  DENO_SLACK_HOOKS,
  DENO_SLACK_SDK,
} from "./libraries.ts";
import { getProtocolInterface, JSONValue } from "./deps.ts";
import { getJSON, isNewSemverRelease } from "./utilities.ts";

const IMPORT_MAP_SDKS = [DENO_SLACK_SDK, DENO_SLACK_API];
const SLACK_JSON_SDKS = [
  DENO_SLACK_HOOKS, // should be the only one needed now that the get-hooks hook is supported
];

interface CheckUpdateResponse {
  name: string;
  releases: Release[];
  message?: string;
  url?: string;
  error?: {
    message: string;
  } | null;
}

interface VersionMap {
  [key: string]: Release;
}

export interface Release {
  name: string;
  current?: string;
  latest?: string;
  update?: boolean;
  breaking?: boolean;
  message?: string;
  url?: string;
  error?: {
    message: string;
  } | null;
}

interface InaccessibleFile {
  name: string;
  error: Error;
}

export const checkForSDKUpdates = async () => {
  const { versionMap, inaccessibleFiles } = await createVersionMap();
  const updateResp = createUpdateResp(versionMap, inaccessibleFiles);
  return updateResp;
};

/**
 * createVersionMap creates an object that contains each dependency,
 * featuring information about the current and latest versions, as well
 * as if breaking changes are present and if any errors occurred during
 * version retrieval.
 */
export async function createVersionMap(): Promise<
  { versionMap: VersionMap; inaccessibleFiles: InaccessibleFile[] }
> {
  const { versionMap, inaccessibleFiles } = await readProjectDependencies();

  // Check each dependency for updates, classify update as breaking or not,
  // craft message with information retrieved, and note any error that occurred.
  for (const [sdk, value] of Object.entries(versionMap)) {
    if (value) {
      const current = versionMap[sdk].current || "";
      let latest = "", error = null;

      try {
        latest = await fetchLatestModuleVersion(sdk);
      } catch (err) {
        error = err;
      }

      const update = (!!current && !!latest) &&
        isNewSemverRelease(current, latest);
      const breaking = hasBreakingChange(current, latest);

      versionMap[sdk] = {
        ...versionMap[sdk],
        latest,
        update,
        breaking,
        error,
      };
    }
  }

  return { versionMap, inaccessibleFiles };
}

/** readProjectDependencies cycles through supported project
 * dependency files and maps them to the versionMap that contains
 * each dependency's update information.
 */
export async function readProjectDependencies(): Promise<
  { versionMap: VersionMap; inaccessibleFiles: InaccessibleFile[] }
> {
  const cwd = Deno.cwd();
  const versionMap: VersionMap = {};
  const { dependencyFiles, inaccessibleDenoFiles } =
    await gatherDependencyFiles(cwd);
  const inaccessibleFiles = [...inaccessibleDenoFiles];

  for (const [fileName, depKey] of dependencyFiles) {
    try {
      const fileJSON = await getJSON(`${cwd}/${fileName}`);
      const fileDependencies = extractDependencies(fileJSON, depKey);

      // For each dependency found, compare to SDK-related dependency
      // list and, if known, update the versionMap with version information
      for (const [_, val] of fileDependencies) {
        for (const sdk of [...IMPORT_MAP_SDKS, ...SLACK_JSON_SDKS]) {
          if (val.includes(sdk)) {
            versionMap[sdk] = {
              name: sdk,
              current: extractVersion(val),
            };
          }
        }
      }
    } catch (err) {
      inaccessibleFiles.push({ name: fileName, error: err });
    }
  }

  return { versionMap, inaccessibleFiles };
}

/**
 * gatherDependencyFiles rounds up all SDK-supported dependency files, as well
 * as those dependency files referenced in deno.json or deno.jsonc, and returns
 * an array of arrays made up of filename and dependency key pairs.
 */
export async function gatherDependencyFiles(
  cwd: string,
): Promise<
  {
    dependencyFiles: [string, "imports" | "hooks"][];
    inaccessibleDenoFiles: InaccessibleFile[];
  }
> {
  const dependencyFiles: [string, "imports" | "hooks"][] = [
    ["slack.json", "hooks"],
    ["slack.jsonc", "hooks"],
  ];

  // Parse deno.* files for `importMap` dependency file
  const { denoJSONDepFiles, inaccessibleDenoFiles } =
    await getDenoImportMapFiles(cwd);
  dependencyFiles.push(...denoJSONDepFiles);

  return { dependencyFiles, inaccessibleDenoFiles };
}

/**
 * getDenoImportMapFiles cycles through supported deno.* files and,
 * if an `importMap` key is found, returns an array of arrays made up
 * of filename and dependency key pairs.
 *
 * ex: [["import_map.json", "imports"], ["custom_map.json", "imports"]]
 */
export async function getDenoImportMapFiles(
  cwd: string,
): Promise<
  {
    denoJSONDepFiles: [string, "imports"][];
    inaccessibleDenoFiles: InaccessibleFile[];
  }
> {
  const denoJSONFiles = ["deno.json", "deno.jsonc"];
  const denoJSONDepFiles: [string, "imports"][] = [];
  const inaccessibleDenoFiles: InaccessibleFile[] = [];

  for (const fileName of denoJSONFiles) {
    try {
      const denoJSON = await getJSON(`${cwd}/${fileName}`);
      const jsonIsParsable = denoJSON && typeof denoJSON === "object" &&
        !Array.isArray(denoJSON) && denoJSON.importMap;

      if (jsonIsParsable) {
        denoJSONDepFiles.push([`${denoJSON.importMap}`, "imports"]);
      }
    } catch (err) {
      inaccessibleDenoFiles.push({ name: fileName, error: err });
    }
  }

  return { denoJSONDepFiles, inaccessibleDenoFiles };
}

/**
 * extractDependencies accepts the contents of a JSON file and a
 * top-level, file-specific key within that file that corresponds to
 * recognized project dependencies. If found, returns an array of key,
 * value pairs that make use of the dependencies.
 */
export function extractDependencies(
  json: JSONValue,
  key: string,
): [string, string][] {
  // Determine if the JSON passed is an object
  const jsonIsParsable = json !== null && typeof json === "object" &&
    !Array.isArray(json);

  if (jsonIsParsable) {
    const dependencyMap = json[key];
    return dependencyMap ? Object.entries(dependencyMap) : [];
  }

  return [];
}

/** fetchLatestModuleVersion retrieves the published metadata.json that
 * contains all releases and returns the latest published version
 */
export async function fetchLatestModuleVersion(
  moduleName: string,
): Promise<string> {
  try {
    const res = await fetch("https://api.slack.com/slackcli/metadata.json");
    const jsonData = await res.json();
    const hypenatedModuleName = moduleName.replaceAll("_", "-");
    return jsonData[hypenatedModuleName].releases[0].version;
  } catch (err) {
    throw new Error(err);
  }
}

/**
 * extractVersion takes in a URL formatted string, searches for a version,
 * and, if version is found, returns that version.
 *
 * Example input: https://deno.land/x/deno_slack_sdk@2.6.0/
 */
export function extractVersion(str: string): string {
  const at = str.indexOf("@");

  // Doesn't contain an @ version
  if (at === -1) return "";

  const slash = str.indexOf("/", at);
  const version = slash < at
    ? str.substring(at + 1)
    : str.substring(at + 1, slash);
  return version;
}

/**
 * hasBreakingChange determines whether or not there is a
 * major version difference of greater or equal to 1 between the current
 * and latest version.
 */
export function hasBreakingChange(current: string, latest: string): boolean {
  const currMajor = current.split(".")[0];
  const latestMajor = latest.split(".")[0];
  return +latestMajor - +currMajor >= 1;
}

/**
 * createUpdateResp creates and returns an CheckUpdateResponse object
 * that contains information about a collection of release dependencies
 * in the shape of an object that the CLI expects to consume
 */
export function createUpdateResp(
  versionMap: VersionMap,
  inaccessibleFiles: InaccessibleFile[],
): CheckUpdateResponse {
  const name = "the Slack SDK";
  const releases = [];
  const message = "";
  const url = "https://api.slack.com/automation/changelog";
  const fileErrorMsg = createFileErrorMsg(inaccessibleFiles);

  let error = null;
  let errorMsg = "";

  // Output information for each dependency
  for (const sdk of Object.values(versionMap)) {
    // Dependency has an update OR the fetch of update failed
    if (sdk) {
      releases.push(sdk);

      // Add the dependency that failed to be fetched to the top-level error message
      if (sdk.error && sdk.error.message) {
        errorMsg += errorMsg
          ? `, ${sdk.name}`
          : `An error occurred fetching updates for the following packages: ${sdk.name}`;
      }
    }
  }

  // If there were issues accessing dependency files, append error message(s)
  if (inaccessibleFiles.length) {
    errorMsg += errorMsg ? `\n\n   ${fileErrorMsg}` : fileErrorMsg;
  }

  if (errorMsg) error = { message: errorMsg };

  return {
    name,
    message,
    releases,
    url,
    error,
  };
}

/**
 * createFileErrorMsg creates and returns an error message that
 * contains lightly formatted information about the dependency
 * files that were found but otherwise inaccessible/unreadable.
 */
export function createFileErrorMsg(
  inaccessibleFiles: InaccessibleFile[],
): string {
  let fileErrorMsg = "";

  // There were issues with reading some of the files that were found
  for (const file of inaccessibleFiles) {
    // Skip surfacing error to user if supported file was merely not found
    if (file.error.cause instanceof Deno.errors.NotFound) continue;

    fileErrorMsg += fileErrorMsg
      ? `\n   ${file.name}: ${file.error.message}`
      : `An error occurred while reading the following files: \n\n   ${file.name}: ${file.error.message}`;
  }

  return fileErrorMsg;
}

if (import.meta.main) {
  const protocol = getProtocolInterface(Deno.args);
  protocol.respond(JSON.stringify(await checkForSDKUpdates()));
}
