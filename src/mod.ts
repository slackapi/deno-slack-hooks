import { HOOKS_TAG, RUNTIME_TAG } from "./libraries.ts";
import { getStartHookAdditionalDenoFlags } from "./flags.ts";

export const projectScripts = (args: string[]) => {
  const startHookFlags = getStartHookAdditionalDenoFlags(args);
  return {
    "runtime": "deno",
    "hooks": {
      "get-manifest":
        `deno run -q --config=deno.jsonc --allow-read --allow-net --allow-env https://deno.land/x/${HOOKS_TAG}/get_manifest.ts`,
      "get-trigger":
        `deno run -q --config=deno.jsonc --allow-read --allow-net --allow-env https://deno.land/x/${HOOKS_TAG}/get_trigger.ts`,
      "build":
        `deno run -q --config=deno.jsonc --allow-read --allow-write --allow-net --allow-run --allow-env https://deno.land/x/${HOOKS_TAG}/build.ts`,
      "start":
        `deno run -q --config=deno.jsonc --allow-read --allow-net --allow-run --allow-env https://deno.land/x/${RUNTIME_TAG}/local-run.ts ${startHookFlags}`,
      "check-update":
        `deno run -q --config=deno.jsonc --allow-read --allow-net https://deno.land/x/${HOOKS_TAG}/check_update.ts`,
      "install-update":
        `deno run -q --config=deno.jsonc --allow-run --allow-read --allow-write --allow-net https://deno.land/x/${HOOKS_TAG}/install_update.ts`,
      "doctor":
        `deno run -q --config=deno.jsonc --allow-read --allow-net https://deno.land/x/${HOOKS_TAG}/doctor.ts`,
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
