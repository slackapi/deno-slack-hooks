import { getTrigger } from "../get_trigger.ts";
import { assertRejects, assertStringIncludes } from "../dev_deps.ts";

Deno.test("get-trigger hook", async (t) => {
  await t.step("getTrigger function", async (tt) => {
    await tt.step("should throw if no source CLI flag provided", () => {
      assertRejects(
        () => getTrigger([]),
        Error,
        "source path needs to be defined",
      );
    });

    await tt.step("should throw if provided source is not a file", () => {
      assertRejects(
        () => getTrigger(["--source", "src"]),
        Error,
        "source is not a valid file",
      );
    });

    await tt.step("should return contents of a valid JSON file", async () => {
      const json = await getTrigger([
        "--source",
        "src/tests/fixtures/triggers/valid_trigger.json",
      ]);
      assertStringIncludes(json.name, "greeting");
    });

    await tt.step("should return contents of a valid .ts file", async () => {
      const json = await getTrigger([
        "--source",
        "src/tests/fixtures/triggers/valid_trigger.ts",
      ]);
      assertStringIncludes(json.name, "greeting");
    });

    await tt.step("should throw if provided .ts has no default export", () => {
      assertRejects(
        () =>
          getTrigger([
            "--source",
            "src/tests/fixtures/triggers/no_default_export_trigger.ts",
          ]),
        Error,
        "no default export",
      );
    });

    await tt.step(
      "should throw if provided .ts has a non-object default export",
      () => {
        assertRejects(
          () =>
            getTrigger([
              "--source",
              "src/tests/fixtures/triggers/non_object_trigger.ts",
            ]),
          Error,
          "not an object",
        );
      },
    );
  });
});
