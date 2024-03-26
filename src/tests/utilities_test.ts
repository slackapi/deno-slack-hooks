import { assertEquals, assertRejects } from "../dev_deps.ts";
import { isNewSemverRelease, validateManifestFunctions } from "../utilities.ts";

Deno.test("utilities.ts", async (t) => {
  await t.step("validateManifestFunctions function", async (tt) => {
    await tt.step(
      "should throw an exception if a function file that does not have a default export",
      async () => {
        const manifest = {
          "functions": {
            "test_function": {
              "title": "Test function",
              "description": "this is a test",
              "source_file":
                "src/tests/fixtures/functions/test_function_no_export_file.ts",
              "input_parameters": {
                "required": [],
                "properties": {},
              },
              "output_parameters": {
                "required": [],
                "properties": {},
              },
            },
          },
        };
        await assertRejects(
          () =>
            validateManifestFunctions(
              Deno.cwd(),
              manifest,
            ),
          Error,
          "no default export",
        );
      },
    );

    await tt.step(
      "should throw an exception when fed a function file that has a non-function default export",
      async () => {
        const manifest = {
          "functions": {
            "test_function": {
              "title": "Test function",
              "description": "this is a test",
              "source_file":
                "src/tests/fixtures/functions/test_function_not_function_file.ts",
              "input_parameters": {
                "required": [],
                "properties": {},
              },
              "output_parameters": {
                "required": [],
                "properties": {},
              },
            },
          },
        };
        await assertRejects(
          () =>
            validateManifestFunctions(
              Deno.cwd(),
              manifest,
            ),
          Error,
          "default export is not a function",
        );
      },
    );

    await tt.step(
      "should throw an exception when manifest entry for a function points to a non-existent file",
      async () => {
        const manifest = {
          "functions": {
            "test_function": {
              "title": "Test function",
              "description": "this is a test",
              "source_file":
                "src/tests/fixtures/functions/test_function_this_file_does_not_exist.ts",
              "input_parameters": {
                "required": [],
                "properties": {},
              },
              "output_parameters": {
                "required": [],
                "properties": {},
              },
            },
          },
        };
        await assertRejects(
          () =>
            validateManifestFunctions(
              Deno.cwd(),
              manifest,
            ),
          Error,
          "Could not find file",
        );
      },
    );

    await tt.step(
      "should throw an exception when manifest entry for a function does not have a source_file defined",
      async () => {
        const manifest = {
          "functions": {
            "test_function": {
              "title": "Test function",
              "description": "this is a test",
              "input_parameters": {
                "required": [],
                "properties": {},
              },
              "output_parameters": {
                "required": [],
                "properties": {},
              },
            },
          },
        };
        await assertRejects(
          () =>
            validateManifestFunctions(
              Deno.cwd(),
              manifest,
            ),
          Error,
          "No source_file property provided",
        );
      },
    );

    await tt.step("should ignore functions of type 'API'", async () => {
      const manifest = {
        "functions": {
          "test_function": {
            "title": "Test function",
            "description": "this is a test",
            "source_file":
              "src/tests/fixtures/functions/test_function_not_function_file.ts",
            "type": "API",
            "input_parameters": {
              "required": [],
              "properties": {},
            },
            "output_parameters": {
              "required": [],
              "properties": {},
            },
          },
        },
      };
      await validateManifestFunctions(
        Deno.cwd(),
        manifest,
      );
      // If the above doesn't throw, we good
    });
  });

  await t.step("isNewSemverRelease method", async (evT) => {
    await evT.step("returns true for semver updates", () => {
      assertEquals(isNewSemverRelease("0.0.1", "0.0.2"), true);
      assertEquals(isNewSemverRelease("0.0.1", "0.2.0"), true);
      assertEquals(isNewSemverRelease("0.0.1", "2.0.0"), true);
      assertEquals(isNewSemverRelease("0.1.0", "0.1.1"), true);
      assertEquals(isNewSemverRelease("0.1.0", "0.2.0"), true);
      assertEquals(isNewSemverRelease("0.1.0", "2.0.0"), true);
      assertEquals(isNewSemverRelease("1.0.0", "1.0.1"), true);
      assertEquals(isNewSemverRelease("1.0.0", "1.1.0"), true);
      assertEquals(isNewSemverRelease("1.0.0", "1.1.1"), true);
      assertEquals(isNewSemverRelease("1.0.0", "2.0.0"), true);
      assertEquals(isNewSemverRelease("0.0.2", "0.0.13"), true);
    });
    await evT.step("returns false for semver downgrades", () => {
      assertEquals(isNewSemverRelease("2.0.0", "1.0.0"), false);
      assertEquals(isNewSemverRelease("2.0.0", "0.1.0"), false);
      assertEquals(isNewSemverRelease("2.0.0", "0.3.0"), false);
      assertEquals(isNewSemverRelease("2.0.0", "0.0.1"), false);
      assertEquals(isNewSemverRelease("2.0.0", "0.0.3"), false);
      assertEquals(isNewSemverRelease("2.0.0", "1.1.0"), false);
      assertEquals(isNewSemverRelease("2.0.0", "1.3.0"), false);
      assertEquals(isNewSemverRelease("2.0.0", "1.1.1"), false);
      assertEquals(isNewSemverRelease("2.0.0", "1.3.3"), false);
      assertEquals(isNewSemverRelease("0.2.0", "0.1.0"), false);
      assertEquals(isNewSemverRelease("0.2.0", "0.0.1"), false);
      assertEquals(isNewSemverRelease("0.2.0", "0.0.3"), false);
      assertEquals(isNewSemverRelease("0.2.0", "0.1.1"), false);
      assertEquals(isNewSemverRelease("0.2.0", "0.1.3"), false);
      assertEquals(isNewSemverRelease("0.0.2", "0.0.1"), false);
      assertEquals(isNewSemverRelease("0.0.20", "0.0.13"), false);
    });
    await evT.step("returns false for semver matches", () => {
      assertEquals(isNewSemverRelease("0.0.1", "0.0.1"), false);
      assertEquals(isNewSemverRelease("0.1.0", "0.1.0"), false);
      assertEquals(isNewSemverRelease("0.1.1", "0.1.1"), false);
      assertEquals(isNewSemverRelease("1.0.0", "1.0.0"), false);
      assertEquals(isNewSemverRelease("1.0.1", "1.0.1"), false);
      assertEquals(isNewSemverRelease("1.1.1", "1.1.1"), false);
    });
  });
});
