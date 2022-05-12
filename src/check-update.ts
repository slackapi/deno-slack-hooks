import { HOOKS_TAG } from "./mod.ts";

const DENO_SLACK_SDK = "deno_slack_sdk";
const DENO_SLACK_API = "deno_slack_api";
const DENO_SLACK_HOOKS = HOOKS_TAG.substring(0, HOOKS_TAG.indexOf("@"));
const IMPORT_MAP_SDKS = [DENO_SLACK_SDK, DENO_SLACK_API];
const SLACK_JSON_SDKS = [
  DENO_SLACK_HOOKS, // should be the only one needed now that the get-hooks hook is supported
];

interface UpdateResponse {
  update: boolean;
  breaking: boolean;
  message: string;
  error: {
    message: string;
  };
}

interface VersionMap {
  [key: string]: {
    current: string;
    latest: string;
    update: boolean;
    breaking: boolean;
    error: string;
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

      const update = !!current && current !== latest;
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
  const map = await getJson(`${cwd}/import_map.json`);
  for (const sdkUrl of Object.values(map.imports) as string[]) {
    for (const sdk of IMPORT_MAP_SDKS) {
      if (sdkUrl.includes(sdk)) {
        versionMap[sdk] = {
          latest: "",
          update: false,
          breaking: false,
          error: "",
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
          error: "",
          current: extractVersion(command),
        };
      }
    }
  }

  return versionMap;
}

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
export async function fetchLatestModuleVersion(moduleName: string): Promise<string> {
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

/** createDependencyMsg  creates a terminal-friendly display message
 * that features the name of the dependency, current and latest versions,
 * and visual indication if the change is breaking or an error occurred:
 *
 * › deno_slack_sdk
 *   0.0.3 → 0.0.4
 */
function createDependencyMsg(
  sdk: string,
  breaking: boolean,
  current: string,
  latest: string,
  error: string,
): string {
  const red = "\x1b[31m";
  const yellow = "\x1b[38;5;214m";
  const blue = "\x1b[38;5;39m";
  const grey = "\x1b[38;5;243m";
  const reset = "\x1b[0m";
  const bold = "\x1b[1m";

  // Standard dependency information message
  let message =
    `  › ${bold}${sdk}${reset}\n    ${grey}${current}${reset} → ${bold}${blue}${latest}\n\n${reset}`;

  // An error occurred while fetching the dependency information
  if (error) {
    message =
      `  ${red}✖${reset} ${bold}${sdk}${reset}\n    ${red}${error}\n\n${reset}`;
    return message;
  }

  // Dependency contains a breaking change
  if (breaking) {
    message =
      `  › ${bold}${sdk}${reset}\n    ${grey}${current}${reset} → ${bold}${yellow}${latest} (breaking)\n\n${reset}`;
  }

  return message;
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
 * that contains a summary of the dependency updates in the shape
 * that the Slack CLI is expecting and able to consume
 */
function createUpdateResp(versionMap: VersionMap): UpdateResponse {
  const bold = "\x1b[1m";
  const reset = "\x1b[0m";
  const blue = "\x1b[38;5;39m";

  let message = "";
  let update = false;
  let errorMsg = "";
  let breaking = false;

  // Output information for each dependency
  for (const [sdk, value] of Object.entries(versionMap)) {
    if (value && value.update) {
      update = true;
      message += createDependencyMsg(
        sdk,
        value.breaking,
        value.current,
        value.latest,
        value.error,
      );
      if (value.breaking) breaking = true;
      if (value.error) {
        errorMsg += errorMsg
          ? `, ${sdk}`
          : `An error occurred while retrieving updates for the following packages: ${sdk}`;
      }
    }
  }

  // Add reference to Release Notes
  message +=
    `  To manually update, read the release notes at:\n  ${bold}${blue}https://api.slack.com/future/changelog${reset}`;

  return { update, breaking, message, error: { message: errorMsg } };
}

if (import.meta.main) {
  console.log(JSON.stringify(await checkForSDKUpdates()));
}
