export const BUILDER_TAG = "deno_slack_builder@0.0.7";
export const RUNTIME_TAG = "deno_slack_runtime@0.0.4";

export const projectScripts = () => {
  return {
    "hooks": {
      "get-manifest":
        `deno run -q --unstable --import-map=import_map.json --allow-read --allow-net https://deno.land/x/${BUILDER_TAG}/mod.ts --manifest`,
      "build":
        `deno run -q --unstable --import-map=import_map.json --allow-read --allow-write --allow-net https://deno.land/x/${BUILDER_TAG}/mod.ts`,
      "start":
        `deno run -q --unstable --import-map=import_map.json --allow-read --allow-net https://deno.land/x/${RUNTIME_TAG}/local-run.ts`,
    },
    "config": {
      "watch": {
        "filter_regex": "^manifest\\.(ts|js|json)$",
        "paths": ["."],
      },
    },
  };
};

if (import.meta.main) {
  console.log(JSON.stringify(projectScripts()));
}
