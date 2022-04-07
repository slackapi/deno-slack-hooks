export const BUILDER_TAG = "deno_slack_builder@0.0.5";
export const RUNTIME_TAG = "deno_slack_runtime@0.0.3";

export const projectScripts = () => {
  return {
    "manifest": {
      "script": {
        "default":
          `deno run -q --unstable --import-map=import_map.json --allow-read --allow-net https://deno.land/x/${BUILDER_TAG}/mod.ts --manifest`,
      },
    },
    "package": {
      "script": {
        "default":
          `deno run -q --unstable --import-map=import_map.json --allow-read --allow-write --allow-net https://deno.land/x/${BUILDER_TAG}/mod.ts`,
      },
    },
    "run": {
      "script": {
        "default":
          `deno run -q --unstable --import-map=import_map.json --allow-read --allow-net https://deno.land/x/${RUNTIME_TAG}/mod.ts`,
      },
      "watcher": {
        "filter_regex": "^manifest\\.(ts|js|json)$",
        "paths": ["."],
      },
    },
  };
};

if (import.meta.main) {
  console.log(JSON.stringify(projectScripts()));
}
