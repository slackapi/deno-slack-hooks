import { cleanManifest, createManifest } from "../get_manifest.ts";
import { assertEquals, assertRejects } from "../dev_deps.ts";

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

  await t.step("createManifest function", async (tt) => {
    // TODO: one of two things need to happen in order to test createManifest out more:
    // 1. need the ability to mock out `Deno.stat` using mock-file (see https://github.com/ayame113/mock-file/issues/7), or
    // 2. we re-write the code in get_manifest.ts to use `Deno.fstat` in place of `Deno.stat`
    /*
    await tt.step(
      "should return manifest.json contents if it solely exists",
      async () => {
        const manifestJSON = { hey: "yo" };
        const cwd = Deno.cwd();
        const f = path.join(cwd, "manifest.json");
        console.log("path is", f);
        const protocol = MockProtocol();
        mockFile.prepareVirtualFile(
          f,
          new TextEncoder().encode(JSON.stringify(manifestJSON)),
          { isFile: true },
        );
        const resp = await createManifest(cwd, protocol);
        assertEquals(resp, manifestJSON);
      },
    );
    */
    await tt.step(
      "should throw if no manifest JSON, TS or JS found",
      async () => {
        await assertRejects(
          () => createManifest(Deno.cwd()),
          Error,
          "Could not find a manifest.json, manifest.ts or manifest.js",
        );
      },
    );
  });
});
