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
      "should invoke `deno bundle` once per non-API function",
      async () => {
        const protocol = MockProtocol();
        const manifest = {
          "functions": {
            "test_function_one": {
              "title": "Test function 1",
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
              "title": "Test function 2",
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
            "api_function_that_should_not_be_built": {
              "type": "API",
              "title": "API function",
              "description": "should most definitely not be bundled",
              "source_file":
                "src/tests/fixtures/functions/this_shouldnt_matter.ts",
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
        const runResponse = {
          close: () => {},
          status: () => Promise.resolve({ code: 0, success: true }),
        } as unknown as Deno.Process<Deno.RunOptions>;
        const runStub = stub(
          Deno,
          "run",
          returnsNext([runResponse, runResponse]),
        );
        await validateAndCreateFunctions(
          Deno.cwd(),
          outputDir,
          manifest,
          protocol,
        );
        assertSpyCalls(runStub, 2);
        runStub.restore();
      },
    );

    await tt.step(
      "should throw an exception if a function file does not have a default export",
      async () => {
        const protocol = MockProtocol();
        const outputDir = await Deno.makeTempDir();
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
            validateAndCreateFunctions(
              Deno.cwd(),
              outputDir,
              manifest,
              protocol,
            ),
          Error,
          "no default export",
        );
      },
    );

    await tt.step(
      "should throw an exception if a function file has a non-function default export",
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
        const protocol = MockProtocol();
        const outputDir = await Deno.makeTempDir();
        await assertRejects(
          () =>
            validateAndCreateFunctions(
              Deno.cwd(),
              outputDir,
              manifest,
              protocol,
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
        const protocol = MockProtocol();
        const outputDir = await Deno.makeTempDir();
        await assertRejects(
          () =>
            validateAndCreateFunctions(
              Deno.cwd(),
              outputDir,
              manifest,
              protocol,
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
        const protocol = MockProtocol();
        const outputDir = await Deno.makeTempDir();
        await assertRejects(
          () =>
            validateAndCreateFunctions(
              Deno.cwd(),
              outputDir,
              manifest,
              protocol,
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
      const protocol = MockProtocol();
      const outputDir = await Deno.makeTempDir();
      await validateAndCreateFunctions(
        Deno.cwd(),
        outputDir,
        manifest,
        protocol,
      );
      // Stub out call to `Deno.run` and fake return a success
      const runResponse = {
        close: () => {},
        status: () => Promise.resolve({ code: 0, success: true }),
      } as unknown as Deno.Process<Deno.RunOptions>;
      const runStub = stub(
        Deno,
        "run",
        returnsNext([runResponse, runResponse]),
      );
      // Make sure we didn't shell out to Deno.run
      assertSpyCalls(runStub, 0);
      runStub.restore();
    });
  });
});
