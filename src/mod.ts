import { BUILDER_TAG, HOOKS_TAG, RUNTIME_TAG } from "./libraries.ts";

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
      "check-update":
        `deno run -q --unstable --config=deno.jsonc --allow-read --allow-net https://deno.land/x/${HOOKS_TAG}/check-update.ts`,
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
  console.log(JSON.stringify(projectScripts()));
}
