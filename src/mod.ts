// TODO: as per below TODOs also reuse the appropriate HOOKS tag in the URLs below prior to merge/release
import { /*HOOKS_TAG*/ RUNTIME_TAG } from "./libraries.ts";
import { getStartHookAdditionalDenoFlags } from "./flags.ts";

export const projectScripts = (args: string[]) => {
  const startHookFlags = getStartHookAdditionalDenoFlags(args);
  return {
    "runtime": "deno",
    "hooks": {
      "get-manifest":
        // TODO: temporarily use -r and reference this branch when loading hook code for itself (this makes it easier to test). prior to merging, need to update the URL here to reference the expected hooks version this change will be released under by using the HOOKS_TAG import at the top.
        `deno run -r -q --config=deno.jsonc --allow-read --allow-net --allow-env https://raw.githubusercontent.com/slackapi/deno-slack-hooks/multi-protocols-with-builder/src/get_manifest.ts`,
      "get-trigger":
        // TODO: temporarily use -r and reference this branch when loading hook code for itself (this makes it easier to test). prior to merging, need to update the URL here to reference the expected hooks version this change will be released under by using the HOOKS_TAG import at the top.
        `deno run -r -q --config=deno.jsonc --allow-read --allow-net --allow-env https://raw.githubusercontent.com/slackapi/deno-slack-hooks/multi-protocols-with-builder/src/get_trigger.ts`,
      "build":
        // TODO: temporarily use -r and reference this branch when loading hook code for itself (this makes it easier to test). prior to merging, need to update the URL here to reference the expected hooks version this change will be released under by using the HOOKS_TAG import at the top.
        `deno run -r -q --config=deno.jsonc --allow-read --allow-write --allow-net --allow-run --allow-env https://raw.githubusercontent.com/slackapi/deno-slack-hooks/multi-protocols-with-builder/src/build.ts`,
      "start":
        `deno run -q --config=deno.jsonc --allow-read --allow-net --allow-run --allow-env https://deno.land/x/${RUNTIME_TAG}/local-run.ts ${startHookFlags}`,
      "check-update":
        // TODO: temporarily use -r and reference this branch when loading hook code for itself (this makes it easier to test). prior to merging, need to update the URL here to reference the expected hooks version this change will be released under by using the HOOKS_TAG import at the top.
        `deno run -r -q --config=deno.jsonc --allow-read --allow-net https://raw.githubusercontent.com/slackapi/deno-slack-hooks/multi-protocols-with-builder/src/check_update.ts`,
      "install-update":
        // TODO: temporarily use -r and reference this branch when loading hook code for itself (this makes it easier to test). prior to merging, need to update the URL here to reference the expected hooks version this change will be released under by using the HOOKS_TAG import at the top.
        `deno run -r -q --config=deno.jsonc --allow-run --allow-read --allow-write --allow-net https://raw.githubusercontent.com/slackapi/deno-slack-hooks/multi-protocols-with-builder/src/install_update.ts`,
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
