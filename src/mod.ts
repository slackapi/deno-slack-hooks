import { getStartHookAdditionalDenoFlags } from "./flags.ts";

export const BUILDER_TAG = "deno_slack_builder@0.0.10";
export const RUNTIME_TAG = "deno_slack_runtime@0.0.6";

export const projectScripts = (args: string[]) => {
  const startHookFlags = getStartHookAdditionalDenoFlags(args);
  return {
    "runtime": "deno",
    "hooks": {
      "get-manifest":
        `deno run -q --unstable --config=deno.jsonc --allow-read --allow-net https://deno.land/x/${BUILDER_TAG}/mod.ts --manifest`,
      "build":
        `deno run -q --unstable --config=deno.jsonc --allow-read --allow-write --allow-net https://deno.land/x/${BUILDER_TAG}/mod.ts`,
      "start":
        `deno run -q --unstable --config=deno.jsonc --allow-read --allow-net ${startHookFlags} https://deno.land/x/${RUNTIME_TAG}/local-run.ts`,
    },
    "config": {
      "watch": {
        "filter-regex": "^manifest\\.(ts|js|json)$",
        "paths": ["."],
      },
    },
  };
};

if (import.meta.main) {
  console.log(JSON.stringify(projectScripts(Deno.args)));
}
