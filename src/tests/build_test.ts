import { validateAndCreateFunctions } from "../build.ts";
import {
  //assertEquals,
  assertExists,
  assertRejects,
  assertSpyCalls,
  assertStringIncludes,
  Spy,
} from "../dev_deps.ts";
import { MockProtocol } from "../dev_deps.ts";

Deno.test("build hook tests", async (t) => {
  await t.step("validateAndCreateFunctions", async (tt) => {
    await tt.step("should exist", () => {
      assertExists(validateAndCreateFunctions);
    });
    await tt.step(
      "should not throw an exception when fed a function file that has a default export",
      async () => {
        const hookCLI = MockProtocol();
        const manifest = {
          "functions": {
            "test_function": {
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
        const outputDir = await Deno.makeTempDir();
        await validateAndCreateFunctions(
          Deno.cwd(),
          outputDir,
          manifest,
          hookCLI,
        );
        const logSpy = hookCLI.log as Spy;
        assertStringIncludes(logSpy.calls[1].args[0], "wrote function file");
        assertSpyCalls(logSpy, 2);
      },
    );
    await tt.step(
      "should throw an exception when fed a function file that does not have a default export",
      async () => {
        const hookCLI = MockProtocol();
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
        const outputDir = await Deno.makeTempDir();
        await assertRejects(
          () =>
            validateAndCreateFunctions(
              Deno.cwd(),
              outputDir,
              manifest,
              hookCLI,
            ),
          Error,
          "default export handler",
        );
      },
    );
    await tt.step(
      "should throw an exception when fed a function file that has a non-function default export",
      async () => {
        const hookCLI = MockProtocol();
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
        const outputDir = await Deno.makeTempDir();
        await assertRejects(
          () =>
            validateAndCreateFunctions(
              Deno.cwd(),
              outputDir,
              manifest,
              hookCLI,
            ),
          Error,
          "default export handler",
        );
      },
    );
  });
});
