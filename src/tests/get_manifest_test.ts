import { cleanManifest, getManifest } from "../get_manifest.ts";
import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "../dev_deps.ts";
import { path } from "../deps.ts";

Deno.test("get-manifest hook tests", async (t) => {
  await t.step(
    "cleanManifest function",
    async (tt) => {
      await tt.step(
        "should remove `source_file` property from function definitions",
        () => {
          // Create a partial of a manifest w/ just a function
          const manifest = {
            "functions": {
              "reverse": {
                "title": "Reverse",
                "description": "Takes a string and reverses it",
                "source_file": "functions/reverse.ts",
                "input_parameters": {
                  "required": [
                    "stringToReverse",
                  ],
                  "properties": {
                    "stringToReverse": {
                      "type": "string",
                      "description": "The string to reverse",
                    },
                  },
                },
                "output_parameters": {
                  "required": [
                    "reverseString",
                  ],
                  "properties": {
                    "reverseString": {
                      "type": "string",
                      "description": "The string in reverse",
                    },
                  },
                },
              },
            },
          };

          const cleanedManifest = cleanManifest(manifest);

          assertEquals(
            cleanedManifest.functions.reverse.source_file,
            undefined,
          );
        },
      );
    },
  );

  await t.step("getManifest function", async (tt) => {
    // TODO: one of two things need to happen in order to test getManifest out more:
    // 1. need the ability to mock out `Deno.stat` using mock-file (see https://github.com/ayame113/mock-file/issues/7), or
    // 2. we re-write the code in get_manifest.ts to use `Deno.fstat` in place of `Deno.stat`
    // In the mean time, we can use actual files on the actual filesystem, as un-unit-testy as that is,
    // to ensure we arent doing anything silly or dangerous
    await tt.step(
      "should return valid manifest.json contents if it solely exists",
      async () => {
        const manifest = await getManifest(
          path.join(
            Deno.cwd(),
            "src/tests/fixtures/manifests/valid-manifest-json",
          ),
        );
        assertStringIncludes(manifest.name, "only a manifest.json");
      },
    );

    await tt.step(
      "should throw if invalid manifest.json is present",
      async () => {
        await assertRejects(
          () =>
            getManifest(
              path.join(
                Deno.cwd(),
                "src/tests/fixtures/manifests/invalid-manifest-json",
              ),
            ),
        );
      },
    );

    await tt.step(
      "should return valid manifest.ts contents if it solely exists",
      async () => {
        const manifest = await getManifest(
          path.join(
            Deno.cwd(),
            "src/tests/fixtures/manifests/valid-manifest-ts",
          ),
        );
        assertStringIncludes(manifest.display_information.name, "nardwhal");
        assertStringIncludes(
          manifest.display_information.description,
          "manifest.ts for testing",
        );
      },
    );

    await tt.step(
      "should throw if invalid manifest.ts is present",
      async () => {
        await assertRejects(
          () =>
            getManifest(
              path.join(
                Deno.cwd(),
                "src/tests/fixtures/manifests/invalid-manifest-ts",
              ),
            ),
        );
      },
    );

    await tt.step(
      "should throw if manifest.ts default export is not an object",
      async () => {
        await assertRejects(
          () =>
            getManifest(
              path.join(
                Deno.cwd(),
                "src/tests/fixtures/manifests/non-object-manifest-ts",
              ),
            ),
          Error,
          "default export is not an object",
        );
      },
    );

    await tt.step(
      "should return valid manifest.js contents if it solely exists",
      async () => {
        const manifest = await getManifest(
          path.join(
            Deno.cwd(),
            "src/tests/fixtures/manifests/valid-manifest-js",
          ),
        );
        assertStringIncludes(manifest.name, "anyscript");
        assertStringIncludes(manifest.description, "manifest.js for testing");
      },
    );

    await tt.step(
      "should throw if invalid manifest.js is present",
      async () => {
        await assertRejects(
          () =>
            getManifest(
              path.join(
                Deno.cwd(),
                "src/tests/fixtures/manifests/invalid-manifest-js",
              ),
            ),
        );
      },
    );

    await tt.step(
      "should throw if manifest.js default export is not an object",
      async () => {
        await assertRejects(
          () =>
            getManifest(
              path.join(
                Deno.cwd(),
                "src/tests/fixtures/manifests/non-object-manifest-js",
              ),
            ),
          Error,
          "default export is not an object",
        );
      },
    );

    await tt.step(
      "should throw if no manifest JSON, TS or JS found",
      async () => {
        await assertRejects(
          () => getManifest(Deno.cwd()),
          Error,
          "Could not find a manifest.json, manifest.ts or manifest.js",
        );
      },
    );
  });
});
