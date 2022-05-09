import { BUILDER_TAG, HOOKS_TAG, RUNTIME_TAG } from "./deps.ts";

const DENO_SLACK_SDK = "deno_slack_sdk";
const DENO_SLACK_API = "deno_slack_api";
const DENO_SLACK_HOOKS = HOOKS_TAG.substring(0, HOOKS_TAG.indexOf("@"));
const DENO_SLACK_BUILDER = BUILDER_TAG.substring(0, BUILDER_TAG.indexOf("@"));
const DENO_SLACK_RUNTIME = RUNTIME_TAG.substring(0, RUNTIME_TAG.indexOf("@"));
const IMPORT_MAP_SDKS = [ DENO_SLACK_SDK, DENO_SLACK_API ];
const SLACK_JSON_SDKS = [
  DENO_SLACK_HOOKS, // should be the only one needed once the get-scripts hook is supported
  DENO_SLACK_BUILDER, // but just in case, we can look for builder and runtime as well!
  DENO_SLACK_RUNTIME,
];

type UpdateResponse = {
  update:   boolean;
  breaking: boolean;
  message:  string;
  error:    string;
}

type VersionMap = {
  [key: string]: {
    current:  string;
    latest:   string;
    update:   boolean;
    breaking: boolean;
    message:  string;
    error:    string;
  }
}

export const checkForSdkUpdates = async () => {
  const versionMap: VersionMap = await createVersionMap();
  const updateResp = createUpdateResp(versionMap);
  return updateResp;
};

async function createVersionMap() {
  const cwd = Deno.cwd();
  const versionMap: VersionMap = {};

  // Find SDK component versions in import map, if available
  const map = await getJson(`${cwd}/import_map.json`);
  for (const sdkUrl of Object.values(map.imports) as string[]) {
    for (const sdk of IMPORT_MAP_SDKS) {
      if (sdkUrl.includes(sdk)) {
        versionMap[sdk] = { latest: '', update: false, breaking: false, message: '', error: '', current: extractVersion(sdkUrl) };
      }
    }
  }

  // Find SDK component versions in slack.json, if available
  const { hooks }: { [key: string]: string; } = await getJson(`${cwd}/slack.json`);
  for (const command of Object.values(hooks)) {
      // TODO :: Does not cover the case where multiple commands use the same SDK.
      // Only the "last" key containing the relevant SDK will be checked as-is
      for (const sdk of SLACK_JSON_SDKS) {
        if (command.includes(sdk)) {
          versionMap[sdk] = { latest: '', update: false, breaking: false, message: '', error: '', current: extractVersion(command) };
        }
      }
  }

  for (const [sdk, value] of Object.entries(versionMap)) {
    if (value) {
      const current = versionMap[sdk].current;
      let message = '', latest = '', error = '';

      try {
        latest = await fetchLatestModuleVersion(sdk);
      } catch (err) {
        error = `Unable to fetch the latest version.`;
      }

      if (sdk === "deno_slack_sdk") { error = `Unable to fetch the latest version.`;}

      const update = current !== latest;
      const breaking = hasBreakingChange(current, latest);

      if (update) {
        message = createSDKUpdateMessage(sdk, breaking, current, latest, error);
      }

      versionMap[sdk] = { ...versionMap[sdk], latest, update, breaking, message, error };
    }
  }

  return versionMap;
}

async function getJson(file: string) {
  return JSON.parse(await Deno.readTextFile(file));
}

async function fetchLatestModuleVersion(moduleName: string) {
  const res = await fetch(`https://deno.land/x/${moduleName}`, { redirect: "manual" });
 
  const redirect = res.headers.get("location");
  if (redirect === null) { throw new Error(`${moduleName} not found on deno.land!`); }

  return extractVersion(redirect);
}

function extractVersion(str: string) {
  const at = str.indexOf("@");
  const slash = str.indexOf("/", at);
  const version = slash < at ? str.substring(at + 1) : str.substring(at + 1, slash);
  return version;
}

if (import.meta.main) {
  console.log(JSON.stringify(await checkForSdkUpdates()));
}

function createSDKUpdateMessage(sdk: string, breaking: boolean, current: string, latest: string, error: string): string {
  if (sdk === "deno_slack_hooks") { breaking = true;}
  const red = "\x1b[31m", green = "\x1b[32m", reset = "\x1b[0m", bold ="\x1b[1m";
  let message = `  › ${bold}${sdk}${reset}\n    ${current} → ${bold}${green}${latest}\n\n${reset}`;

  // An error occurred while fetching the dependency information
  if (error) {
    message = `  ${red}✖${reset} ${bold}${sdk}${reset}\n    ${red}${error}\n\n${reset}`;
    return message;
  }
  
  // Dependency contains a breaking change
  if (breaking) {
    message = `  › ${bold}${sdk}${reset}\n    ${current} → ${bold}${red}${latest} (breaking)\n\n${reset}`;
  }

  return message;
}

function hasBreakingChange(current: string, latest: string) {
  const currMajor = current.split(".")[0];
  const latestMajor = latest.split(".")[0];
  return +latestMajor - +currMajor >= 1;
}

function createUpdateResp(versionMap: VersionMap): UpdateResponse {
  const bold ="\x1b[1m", reset = "\x1b[0m";
  let message = `${bold}  The following SDK updates are available:${reset}\n\n`
  let error = '';
  let update = true;
  let breaking = false;
  
  for (const [sdk, value] of Object.entries(versionMap)) {
    if (value) {
      message += value["message"];
      if (value.breaking) { breaking = true; }
      if (value.error) { error += error ? `, ${sdk}` : `There was a problem retrieving the following updates: ${sdk}`; }
    }
  }

  if (breaking) {
    const breakWarning = `🛑 Breaking changes in the new version of the SDK.\n  Follow the steps in the release notes to update your app.\n\n`;
    message = breakWarning + message;
  }
  
  return { update, breaking, message, error };
}
