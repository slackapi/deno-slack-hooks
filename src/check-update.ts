import {
  DENO_SLACK_API,
  DENO_SLACK_HOOKS,
  DENO_SLACK_SDK,
} from "./libraries.ts";

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
async function createVersionMap() {
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

/** readProjectDependencies reads from possible dependency files
 * (import_map.json, slack.json) and maps them to the versionMap
 * containing each dependency's update information
 */
async function readProjectDependencies(): Promise<VersionMap> {
  const cwd = Deno.cwd();
  const versionMap: VersionMap = {};

  // Find SDK component versions in import map, if available
  const map = await getJSON(`${cwd}/import_map.json`);
  for (const sdkUrl of Object.values(map.imports) as string[]) {
    for (const sdk of IMPORT_MAP_SDKS) {
      if (sdkUrl.includes(sdk)) {
        versionMap[sdk] = {
          name: sdk,
          current: extractVersion(sdkUrl),
        };
      }
    }
  }

  // Find SDK component versions in slack.json, if available
  const { hooks }: { [key: string]: string } = await getJSON(
    `${cwd}/slack.json`,
  );
  for (const command of Object.values(hooks)) {
    for (const sdk of SLACK_JSON_SDKS) {
      if (command.includes(sdk)) {
        versionMap[sdk] = {
          name: sdk,
          current: extractVersion(command),
        };
      }
    }
  }

  return versionMap;
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
