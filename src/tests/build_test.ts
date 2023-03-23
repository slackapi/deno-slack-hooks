import { validateAndCreateFunctions } from "../build.ts";
import {
  assertExists,
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
        const protocol = MockProtocol();
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
          protocol,
        );
        assertSpyCalls(runStub, 1);
        runStub.restore();
      },
    );
  });
});
