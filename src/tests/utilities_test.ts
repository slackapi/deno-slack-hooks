import { assertEquals, assertRejects } from "../dev_deps.ts";
import { forEachValidatedManifestFunction } from "../utilities.ts";

Deno.test("utilities.ts", async (t) => {
  await t.step("forEachValidatedManifestFunction function", async (tt) => {
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
            forEachValidatedManifestFunction(
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
            forEachValidatedManifestFunction(
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
            forEachValidatedManifestFunction(
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
            forEachValidatedManifestFunction(
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
      await forEachValidatedManifestFunction(
        Deno.cwd(),
        manifest,
      );
      // If the above doesn't throw, we good
    });

    await tt.step(
      "should invoke provided callback, once for each valid function",
      async () => {
        const manifest = {
          "functions": {
            "test_function_one": {
              "title": "Test function",
              "description": "this is a test",
              "source_file":
                "src/tests/fixtures/functions/test_function_file.ts",
              "input_parameters": {
                "required": [],
                "properties": {},
              },
              "output_parameters": {
                "required": [],
                "properties": {},
              },
            },
            "test_function_two": {
              "title": "Test function",
              "description": "this is a test",
              "source_file":
                "src/tests/fixtures/functions/test_function_file.ts",
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
        let counter = 0;
        await forEachValidatedManifestFunction(
          Deno.cwd(),
          manifest,
          async () => {
            await counter++;
          },
        );
        assertEquals(counter, 2);
      },
    );
  });
});
