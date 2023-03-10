// TODO: once deno-slack-runtime is released with new protocol support, import and use the RUNTIME_TAG appropriately.
// TODO: as per below TODOs also reuse the appropriate HOOKS tag in the URLs below prior to merge/release
// import { HOOKS_TAG } from "./libraries.ts";
import { getStartHookAdditionalDenoFlags } from "./flags.ts";
export { getProtocolInterface } from "./deps.ts";
export type { Protocol } from "./deps.ts";

export const projectScripts = (args: string[]) => {
  const startHookFlags = getStartHookAdditionalDenoFlags(args);
  return {
    "runtime": "deno",
    "hooks": {
      "get-manifest":
        // TODO: temporarily reference this branch when loading hook code for itself (this makes it easier to test). prior to merging, need to update the URL here to reference the expected hooks version this change will be released under.
        `deno run -q --config=deno.jsonc --allow-read --allow-net --allow-env https://raw.githubusercontent.com/slackapi/deno-slack-hooks/multi-protocols-with-builder/src/get_manifest.ts`,
      "get-trigger":
        // TODO: temporarily reference this branch when loading hook code for itself (this makes it easier to test). prior to merging, need to update the URL here to reference the expected hooks version this change will be released under.
        `deno run -q --config=deno.jsonc --allow-read --allow-net --allow-env https://raw.githubusercontent.com/slackapi/deno-slack-hooks/multi-protocols-with-builder/src/get_trigger.ts`,
      "build":
        // TODO: temporarily reference this branch when loading hook code for itself (this makes it easier to test). prior to merging, need to update the URL here to reference the expected hooks version this change will be released under.
        `deno run -q --config=deno.jsonc --allow-read --allow-write --allow-net --allow-run --allow-env https://raw.githubusercontent.com/slackapi/deno-slack-hooks/multi-protocols-with-builder/src/build.ts`,
      "start":
        // TODO: once deno-slack-runtime is released with new protocol support, update this URL and the RUNTIME_TAG appropriately.
        `deno run -q --config=deno.jsonc --allow-read --allow-net --allow-run --allow-env https://raw.githubusercontent.com/slackapi/deno-slack-runtime/protocol-support/src/local-run.ts ${startHookFlags}`,
      "check-update":
        // TODO: temporarily reference this branch when loading hook code for itself (this makes it easier to test). prior to merging, need to update the URL here to reference the expected hooks version this change will be released under.
        `deno run -q --config=deno.jsonc --allow-read --allow-net https://raw.githubusercontent.com/slackapi/deno-slack-hooks/multi-protocols-with-builder/src/check_update.ts`,
      "install-update":
        // TODO: temporarily reference this branch when loading hook code for itself (this makes it easier to test). prior to merging, need to update the URL here to reference the expected hooks version this change will be released under.
        `deno run -q --config=deno.jsonc --allow-run --allow-read --allow-write --allow-net https://raw.githubusercontent.com/slackapi/deno-slack-hooks/multi-protocols-with-builder/src/install_update.ts`,
    },
    "config": {
      "protocol-version": ["message-boundaries"],
      "watch": {
        "filter-regex": "\\.(ts|js)$",
        "paths": ["."],
      },
    },
  };
};

if (import.meta.main) {
  console.log(JSON.stringify(projectScripts(Deno.args)));
}
