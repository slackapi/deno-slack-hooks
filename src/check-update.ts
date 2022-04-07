import { BUILDER_TAG, HOOKS_TAG, RUNTIME_TAG } from "./deps.ts";

const DENO_SLACK_SDK = "deno_slack_sdk";
const DENO_SLACK_API = "deno_slack_api";
const DENO_SLACK_HOOKS = HOOKS_TAG.substring(0, HOOKS_TAG.indexOf("@"));
const DENO_SLACK_BUILDER = BUILDER_TAG.substring(0, BUILDER_TAG.indexOf("@"));
const DENO_SLACK_RUNTIME = RUNTIME_TAG.substring(0, RUNTIME_TAG.indexOf("@"));
const IMPORT_MAP_SDKS = [
  DENO_SLACK_SDK,
  DENO_SLACK_API,
];
const SLACK_JSON_SDKS = [
  DENO_SLACK_HOOKS, // should be the only one needed once the get-scripts hook is supported
  DENO_SLACK_BUILDER, // but just in case, we can look for builder and runtime as well!
  DENO_SLACK_RUNTIME,
];
const ALL_SDKS = IMPORT_MAP_SDKS.concat(SLACK_JSON_SDKS);

export const checkForSdkUpdates = async () => {
  const cwd = Deno.cwd();
  // Holds the current version detected of each SDK in the current project
  // deno-lint-ignore no-explicit-any
  const versionMap: any = {};
  ALL_SDKS.forEach((sdk) => {
    versionMap[sdk] = null;
  });
  // Array depicting whether each detected SDK is out of date or not
  const sdksOutOfDate = [];
  // Human-readable message to return to the CLI
  const message = [];

  // Find the SDK component versions in import map, if available
  const map = await getJson(`${cwd}/import_map.json`);
  let sdkUrl: string;
  for (sdkUrl of Object.values(map.imports) as string[]) {
    for (const sdk of IMPORT_MAP_SDKS) {
      if (sdkUrl.includes(sdk)) {
        versionMap[sdk] = extractVersion(sdkUrl);
      }
    }
  }

  // Find SDK component versions in slack.json, if available
  const slack = await getJson(`${cwd}/.slack/slack.json`);
  // deno-lint-ignore no-explicit-any
  let hook: any;
  for (hook of Object.values(slack)) {
    const command = hook.script?.default;
    if (command) {
      // TODO: does not cover the case where multiple commands use the same SDK; only the "last" key containing
      // the relevant SDK will be checked as-is
      for (const sdk of SLACK_JSON_SDKS) {
        if (command.includes(sdk)) {
          versionMap[sdk] = extractVersion(command);
        }
      }
    }
  }

  // Compare current to latest versions of the various SDKs we were able to find
  for (const sdk of ALL_SDKS) {
    const current = versionMap[sdk];
    if (current) {
      const latest = await fetchLatestModuleVersion(sdk);
      const outOfDate = current != latest;
      sdksOutOfDate.push(outOfDate);
      if (outOfDate) {
        message.push(
          `${sdk} is out of date! Latest available version: ${latest}, current version: ${current}.`,
        );
      } else {
        message.push(
          `${sdk} is up to date! Latest available version: ${latest}.`,
        );
      }
    }
  }
  return {
    update: sdksOutOfDate.reduce((acc, cur) => acc || cur, false),
    message: message, //.join("\n")
  };
};

async function getJson(file: string) {
  return JSON.parse(await Deno.readTextFile(file));
}

async function fetchLatestModuleVersion(moduleName: string) {
  const res = await fetch(`https://deno.land/x/${moduleName}`, {
    redirect: "manual",
  });
  const redirect = res.headers.get("location");
  if (redirect === null) {
    throw new Error(`${moduleName} not found on deno.land!`);
  }
  return extractVersion(redirect);
}

function extractVersion(str: string) {
  const at = str.indexOf("@");
  const slash = str.indexOf("/", at);
  return str.substring(at + 1, slash);
}

if (import.meta.main) {
  console.log(JSON.stringify(await checkForSdkUpdates()));
}
