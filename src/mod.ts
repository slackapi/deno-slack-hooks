import { BUILDER_TAG, HOOKS_TAG, RUNTIME_TAG } from "./deps.ts";

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
    "check-update": {
      "script": {
        "default":
          `deno run -q --unstable --import-map=import_map.json --allow-read --allow-net https://deno.land/x/${HOOKS_TAG}/check_update.ts`,
      },
    },
  };
};

if (import.meta.main) {
  console.log(JSON.stringify(projectScripts()));
}
