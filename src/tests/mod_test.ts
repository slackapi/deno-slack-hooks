import { assertStringIncludes } from "../dev_deps.ts";
import hooksVersion from "../version.ts";
import { projectScripts } from "../mod.ts";

Deno.test("projectScripts should return a check-update hook that points to its own version", () => {
  const result = projectScripts([]);
  assertStringIncludes(
    result.hooks["check-update"],
    `deno_slack_hooks@${hooksVersion}/check-update.ts`,
  );
});
