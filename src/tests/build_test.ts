import { validateAndCreateFunctions } from "../build.ts";
import {
  assertExists,
  assertRejects,
  assertSpyCalls,
  returnsNext,
  stub,
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
        // Stub out call to `Deno.run` and fake return a success
        const runStub = stub(
          Deno,
          "run",
          returnsNext([{
            close: () => {},
            status: () => Promise.resolve({ code: 0, success: true }),
          } as unknown as Deno.Process<Deno.RunOptions>]),
        );
        await validateAndCreateFunctions(
          Deno.cwd(),
          outputDir,
          manifest,
          hookCLI,
        );
        assertSpyCalls(runStub, 1);
        runStub.restore();
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

    await tt.step(
      "should throw an exception when manifest entry for a function points to a non-existent file",
      async () => {
        const hookCLI = MockProtocol();
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
          "Could not find file",
        );
      },
    );

    await tt.step(
      "should throw an exception when manifest entry for a function does not have a source_file defined",
      async () => {
        const hookCLI = MockProtocol();
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
          "no source_file was provided",
        );
      },
    );

    await tt.step("should not write out functions of type 'API'", async () => {
      const hookCLI = MockProtocol();
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
      const outputDir = await Deno.makeTempDir();
      await validateAndCreateFunctions(
        Deno.cwd(),
        outputDir,
        manifest,
        hookCLI,
      );
      // Stub out call to `Deno.run` and if invoked, throw an error which should fail the test
      const runStub = stub(
        Deno,
        "run",
        returnsNext([
          new Error(
            "Deno.run should not be invoked, test should fail",
          ) as unknown as Deno.Process<Deno.RunOptions>,
        ]),
      );
      assertSpyCalls(runStub, 0);
    });
  });
});
