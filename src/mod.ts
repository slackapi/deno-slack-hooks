// TODO: once deno-slack-runtime is released with new protocol support, update this URL and the RUNTIME_TAG appropriately.
// import { RUNTIME_TAG } from "./libraries.ts";
import { getStartHookAdditionalDenoFlags } from "./flags.ts";
export { getProtocolInterface } from "./deps.ts";
export type { Protocol } from "./deps.ts";

export const projectScripts = (args: string[]) => {
  const startHookFlags = getStartHookAdditionalDenoFlags(args);
  return {
    "runtime": "deno",
    "hooks": {
      "get-manifest":
        `deno run -q --config=deno.jsonc --allow-read --allow-net --allow-env ${import.meta.url}/../get_manifest.ts`,
      "get-trigger":
        `deno run -q --config=deno.jsonc --allow-read --allow-net --allow-env ${import.meta.url}/../get_trigger.ts`,
      "build":
        `deno run -q --config=deno.jsonc --allow-read --allow-write --allow-net --allow-run --allow-env ${import.meta.url}/../build.ts`,
      "start":
        // TODO: once deno-slack-runtime is released with new protocol support, update this URL and the RUNTIME_TAG appropriately.
        `deno run -q --config=deno.jsonc --allow-read --allow-net --allow-run --allow-env https://raw.githubusercontent.com/slackapi/deno-slack-runtime/protocol-support/src/local-run.ts ${startHookFlags}`,
      "check-update":
        `deno run -q --config=deno.jsonc --allow-read --allow-net ${import.meta.url}/../check_update.ts`,
      "install-update":
        `deno run -q --config=deno.jsonc --allow-run --allow-read --allow-write --allow-net ${import.meta.url}/../install_update.ts`,
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
