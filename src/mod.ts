export const BUILDER_TAG = "deno_slack_builder@0.0.10";
export const RUNTIME_TAG = "deno_slack_runtime@0.0.6";
export const HOOKS_TAG = "deno_slack_hooks@0.0.1";

export const projectScripts = () => {
  return {
    "runtime": "deno",
    "hooks": {
      "get-manifest":
        `deno run -q --unstable --config=deno.jsonc --allow-read --allow-net https://deno.land/x/${BUILDER_TAG}/mod.ts --manifest`,
      "build":
        `deno run -q --unstable --config=deno.jsonc --allow-read --allow-write --allow-net https://deno.land/x/${BUILDER_TAG}/mod.ts`,
      "start":
        `deno run -q --unstable --config=deno.jsonc --allow-read --allow-net https://deno.land/x/${RUNTIME_TAG}/local-run.ts`,
    },
    "config": {
      "watch": {
        "filter-regex": "^manifest\\.(ts|js|json)$",
        "paths": ["."],
      },
    },
    "check-update": {
      "script": {
        "default":
          // `deno run -q --unstable --import-map=import_map.json --allow-read --allow-net https://deno.land/x/${HOOKS_TAG}/check_update.ts`,
          `deno run -q --unstable --import-map=import_map.json --allow-read --allow-net https://deno.land/x/${HOOKS_TAG}/mod.ts --check-update`,
      },
      // TODO :: ask deno sdk team how they'd like check-update to pull information
    },
  };
};

if (import.meta.main) {
  console.log(JSON.stringify(projectScripts()));
}
