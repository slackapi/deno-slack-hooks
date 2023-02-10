import { BUILDER_TAG, HOOKS_TAG, RUNTIME_TAG } from "./libraries.ts";
import { getStartHookAdditionalDenoFlags } from "./flags.ts";

export const projectScripts = (args: string[]) => {
  const startHookFlags = getStartHookAdditionalDenoFlags(args);
  return {
    "runtime": "deno",
    "hooks": {
      "get-manifest":
        `deno run -q --config=deno.jsonc --allow-read --allow-net --allow-env https://raw.githubusercontent.com/slackapi/deno-slack-builder/79a47b0588c2325a4ca2f9fd74cce65074564644/src/mod.ts --manifest`,
      "get-trigger":
        `deno run -q --config=deno.jsonc --allow-read --allow-net --allow-env ${import.meta.url}/../get_trigger.ts`,
      "build":
        `deno run -q --config=deno.jsonc --allow-read --allow-write --allow-net --allow-run --allow-env https://raw.githubusercontent.com/slackapi/deno-slack-builder/79a47b0588c2325a4ca2f9fd74cce65074564644/src/mod.ts`,
      "start":
        `deno run -q --config=deno.jsonc --allow-read --allow-net --allow-run --allow-env https://deno.land/x/${RUNTIME_TAG}/local-run.ts ${startHookFlags}`,
      "check-update":
        `deno run -q --config=deno.jsonc --allow-read --allow-net ${import.meta.url}/../check_update.ts`,
      "install-update":
        `deno run -q --config=deno.jsonc --allow-run --allow-read --allow-write --allow-net ${import.meta.url}/../install_update.ts`,
    },
    "config": {
      "protocol-version": ["message-boundaries", "dont-cross-the-streams"],
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
