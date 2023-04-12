import { assertStringIncludes } from "../dev_deps.ts";
import { VERSIONS } from "../libraries.ts";
import { projectScripts } from "../mod.ts";

Deno.test("projectScripts should return a start hook that points to the enshrined deno-slack-runtime version", () => {
  const result = projectScripts([]);
  assertStringIncludes(
    result.hooks["start"],
    `deno_slack_runtime@${VERSIONS.deno_slack_runtime}/local-run.ts`,
  );
});
