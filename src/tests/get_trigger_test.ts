import { getTrigger } from "../get_trigger.ts";
import { assertRejects } from "../dev_deps.ts";

Deno.test("get-trigger hook", async (t) => {
  await t.step("getTrigger function", async (tt) => {
    await tt.step("should throw if no source CLI flag provided", () => {
      assertRejects(
        () => getTrigger([]),
        Error,
        "source path needs to be defined",
      );
    });
  });
});
