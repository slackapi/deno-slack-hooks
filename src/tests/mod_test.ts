import { assertStringIncludes, sinon } from "../dev_deps.ts";

Deno.test("projectScripts should return a check-update hook that points to its own version", async () => {
  const readStub = sinon.stub(Deno, "readTextFileSync").returns("1.0.0\n");
  const mod = await import("../mod.ts");
  const result = mod.projectScripts([]);
  readStub.restore();
  assertStringIncludes(
    result.hooks["check-update"],
    "deno_slack_hooks@1.0.0/check-update.ts",
  );
});
