import {
  DENO_SLACK_API,
  DENO_SLACK_HOOKS,
  DENO_SLACK_SDK,
} from "./libraries.ts";
import { JSONValue } from "./deps.ts";
import { getJSON } from "./utilities.ts";

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

export const checkForSDKUpdates = async () => {
  const versionMap: VersionMap = await createVersionMap();
  const updateResp = createUpdateResp(versionMap);
  return updateResp;
};

/**
 * createVersionMap creates an object that contains each dependency,
 * featuring information about the current and latest versions, as well
 * as if breaking changes are present and if any errors occurred during
 * version retrieval.
 */
export async function createVersionMap() {
  const versionMap: VersionMap = await readProjectDependencies();

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

      const update = (!!current && !!latest) && current !== latest;
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

  return versionMap;
}

/** readProjectDependencies cycles through supported project
 * dependency files and maps them to the versionMap that contains
 * each dependency's update information.
 */
export async function readProjectDependencies(): Promise<VersionMap> {
  const cwd = Deno.cwd();
  const versionMap: VersionMap = {};
  const dependencyFiles = await gatherDependencyFiles(cwd);

  for (const [file, depKey] of dependencyFiles) {
    const fileJSON = await getJSON(`${cwd}/${file}`);
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
  }

  return versionMap;
}

/**
 * gatherDependencyFiles rounds up all SDK-supported dependency files, as well
 * as those dependency files referenced in deno.json or deno.jsonc, and returns
 * an array of arrays made up of filename and dependency key pairs.
 */
export async function gatherDependencyFiles(
  cwd: string,
): Promise<[string, "imports" | "hooks"][]> {
  const dependencyFiles: [string, "imports" | "hooks"][] = [
    ["slack.json", "hooks"],
  ];

  // Parse deno.* files for `importMap` dependency file
  const denoJSONDepFiles = await getDenoImportMapFiles(cwd);
  dependencyFiles.push(...denoJSONDepFiles);

  return dependencyFiles;
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
): Promise<[string, "imports"][]> {
  const denoJSONFiles = ["deno.json", "deno.jsonc"];
  const dependencyFiles: [string, "imports"][] = [];

  for (const file of denoJSONFiles) {
    const denoJSON = await getJSON(`${cwd}/${file}`);
    const jsonIsParsable = denoJSON && typeof denoJSON === "object" &&
      !Array.isArray(denoJSON) && denoJSON.importMap;

    if (jsonIsParsable) {
      dependencyFiles.push([`${denoJSON.importMap}`, "imports"]);
    }
  }

  return dependencyFiles;
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

/** fetchLatestModuleVersion makes a call to deno.land with the
 * module name and returns the extracted version number, if found
 */
export async function fetchLatestModuleVersion(
  moduleName: string,
): Promise<string> {
  const res = await fetch(`https://deno.land/x/${moduleName}`, {
    redirect: "manual",
  });

  const redirect = res.headers.get("location");
  if (redirect === null) {
    throw new Error(`${moduleName} not found on deno.land!`);
  }

  return extractVersion(redirect);
}

/**
 * extractVersion takes in a string, searches for a version,
 * and, if version is found, returns that version.
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
function hasBreakingChange(current: string, latest: string): boolean {
  const currMajor = current.split(".")[0];
  const latestMajor = latest.split(".")[0];
  return +latestMajor - +currMajor >= 1;
}

/**
 * createUpdateResp creates and returns an CheckUpdateResponse object
 * that contains information about a collection of release dependencies
 * in the shape of an object that the CLI expects to consume
 */
function createUpdateResp(versionMap: VersionMap): CheckUpdateResponse {
  const name = "the Slack SDK";
  const releases = [];
  const message = "";
  const url = "https://api.slack.com/future/changelog";

  let error = null;
  let errorMsg = "";

  // Output information for each dependency
  for (const sdk of Object.values(versionMap)) {
    // Dependency has an update OR the fetch of update failed
    if (sdk && (sdk.update || sdk.error?.message)) {
      releases.push(sdk);

      // Add the dependency that failed to be fetched to the top-level error message
      if (sdk.error && sdk.error.message) {
        errorMsg += errorMsg
          ? `, ${sdk}`
          : `An error occurred fetching updates for the following packages: ${sdk.name}`;
      }
    }
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

if (import.meta.main) {
  console.log(JSON.stringify(await checkForSDKUpdates()));
}
