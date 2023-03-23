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
  });
});
