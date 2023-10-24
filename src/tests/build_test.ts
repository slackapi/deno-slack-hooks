import { validateAndCreateFunctions } from "../build.ts";
import { DenoBundler } from "../bundler/DenoBundler.ts";
import { EsbuildBundler } from "../bundler/mods.ts";
import {
  assertExists,
  assertRejects,
  assertSpyCalls,
  spy,
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

        const commandResp = {
          output: () => Promise.resolve({ code: 0 }),
        } as Deno.Command;

        // Stub out call to `Deno.Command` and fake return a success
        const commandStub = stub(
          Deno,
          "Command",
          () => commandResp,
        );

        const esbuildBundlerSpy = spy(
          EsbuildBundler,
          "bundle",
        );

        try {
          await validateAndCreateFunctions(
            Deno.cwd(),
            outputDir,
            manifest,
            protocol,
          );
          assertSpyCalls(commandStub, 2);
          assertSpyCalls(esbuildBundlerSpy, 0);
        } finally {
          commandStub.restore();
          esbuildBundlerSpy.restore();
        }
      },
    );

    await tt.step(
      "should invoke `esbuild` once per non-API function if bundle fails",
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

        // Stub out call to `Deno.Command` and fake throw error
        const commandStub = stub(
          DenoBundler,
          "bundle",
          () => {
            throw new Error("Error bundling function file");
          },
        );

        // Stub out call to `Deno.writeFile` and fake response
        const writeFileStub = stub(
          Deno,
          "writeFile",
          async () => {},
        );

        try {
          await validateAndCreateFunctions(
            Deno.cwd(),
            outputDir,
            manifest,
            protocol,
          );
          assertSpyCalls(commandStub, 2);
          assertSpyCalls(writeFileStub, 2);
        } finally {
          commandStub.restore();
          writeFileStub.restore();
        }
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

      // Spy on `Deno.Command` and `writeFile`
      const commandStub = spy(
        Deno,
        "Command",
      );
      const writeFileStub = spy(
        Deno,
        "writeFile",
      );

      try {
        await validateAndCreateFunctions(
          Deno.cwd(),
          outputDir,
          manifest,
          protocol,
        );
        assertSpyCalls(commandStub, 0);
        assertSpyCalls(writeFileStub, 0);
      } finally {
        commandStub.restore();
        writeFileStub.restore();
      }
    });
  });
});
