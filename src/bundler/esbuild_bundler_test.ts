import { assertEquals } from "https://deno.land/std@0.138.0/testing/asserts.ts";
import { assertExists } from "../dev_deps.ts";
import { EsbuildBundler } from "./esbuild_bundler.ts";

Deno.test("Esbuild Bundler tests", async (t) => {
  await t.step(EsbuildBundler.bundle.name, async (tt) => {
    await tt.step(
      "should invoke 'esbuild.build' successfully",
      async () => {
        const bundle = await EsbuildBundler.bundle(
          {
            entrypoint: "src/tests/fixtures/functions/test_function_file.ts",
            configPath: `${Deno.cwd()}/deno.jsonc`,
            absWorkingDir: Deno.cwd(),
          },
        );
        assertExists(bundle);
        assertEquals(bundle.length, 195);
      },
    );
  });
});
