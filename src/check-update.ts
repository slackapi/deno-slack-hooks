import {
  DENO_SLACK_API,
  DENO_SLACK_HOOKS,
  DENO_SLACK_SDK,
} from "./libraries.ts";

const IMPORT_MAP_SDKS = [DENO_SLACK_SDK, DENO_SLACK_API];
const SLACK_JSON_SDKS = [
  DENO_SLACK_HOOKS, // should be the only one needed now that the get-hooks hook is supported
];

interface UpdateResponse {
  update: boolean;
  breaking: boolean;
  message: string;
  releases: Release[];
  error: {
    message: string;
  };
}

interface VersionMap {
  [key: string]: Release;
}

interface Release {
  current: string;
  latest: string;
  update: boolean;
  breaking: boolean;
  error: {
    message: string;
  };
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
async function createVersionMap() {
  const versionMap: VersionMap = await readProjectDependencies();

  // Check each dependency for updates, classify update as breaking or not,
  // craft message with information retrieved, and note any error that occurred.
  for (const [sdk, value] of Object.entries(versionMap)) {
    if (value) {
      const current = versionMap[sdk].current;
      let latest = "", error = "";

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
        error: { message: error },
      };
    }
  }

  return versionMap;
}

/** readProjectDependencies reads from possible dependency files
 * (import_map.json, slack.json) and maps them to the versionMap
 * containing each dependency's update information
 */
async function readProjectDependencies(): Promise<VersionMap> {
  const cwd = Deno.cwd();
  const versionMap: VersionMap = {};

  // Find SDK component versions in import map, if available
  const map = await getJson(`${cwd}/import_map.json`);
  for (const sdkUrl of Object.values(map.imports) as string[]) {
    for (const sdk of IMPORT_MAP_SDKS) {
      if (sdkUrl.includes(sdk)) {
        versionMap[sdk] = {
          latest: "",
          update: false,
          breaking: false,
          error: { message: "" },
          current: extractVersion(sdkUrl),
        };
      }
    }
  }

  // Find SDK component versions in slack.json, if available
  const { hooks }: { [key: string]: string } = await getJson(
    `${cwd}/slack.json`,
  );
  for (const command of Object.values(hooks)) {
    for (const sdk of SLACK_JSON_SDKS) {
      if (command.includes(sdk)) {
        versionMap[sdk] = {
          latest: "",
          update: false,
          breaking: false,
          error: { message: "" },
          current: extractVersion(command),
        };
      }
    }
  }

  return versionMap;
}

/**
 * getJson attempts to read the given file. If successful,
 * it returns an object of the contained JSON. If the extraction
 * fails, it returns an empty object.
 */
async function getJson(file: string) {
  try {
    return JSON.parse(await Deno.readTextFile(file));
  } catch (_) {
    return {};
  }
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

export function extractVersion(str: string) {
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
 * createUpdateResp creates and returns an UpdateResponse object
 * that contains a summary of the dependency updates, as well as
 * the detail of each dependency update response, all in the shape
 * that the Slack CLI is expecting and able to consume
 */
function createUpdateResp(versionMap: VersionMap): UpdateResponse {
  const releases = [];
  const bold = "\x1b[1m";
  const reset = "\x1b[0m";
  const blue = "\x1b[38;5;39m";

  let message =
    `The Slack SDK has updates available!\n\n   To manually update, read the release notes at:\n   ${bold}${blue}https://api.slack.com/future/changelog${reset}`;
  let update = false;
  let breaking = false;
  let errorMsg = "";

  // Output information for each dependency
  for (const [sdk, value] of Object.entries(versionMap)) {
    // Dependency has an update or it tried to fetch update information and failed
    if (value && (value.update || value.error.message)) {
      releases.push({ name: sdk, ...value });
      if (value.update) update = true;
      if (value.breaking) breaking = true;
      if (value.error.message) {
        errorMsg += errorMsg
          ? `, ${sdk}`
          : `An error occurred while retrieving updates for the following packages: ${sdk}`;
      }
    }
  }

  // No confirmed update, error while fetching
  if (!update && errorMsg) {
    message = "The Slack SDK encountered errors while checking for updates.";
  }

  return {
    update,
    breaking,
    message,
    releases,
    error: { message: errorMsg },
  };
}

if (import.meta.main) {
  console.log(JSON.stringify(await checkForSDKUpdates()));
}
