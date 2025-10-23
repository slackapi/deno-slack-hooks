import { assertRejects, assertSpyCall, stub } from "../dev_deps.ts";
import { BundleError } from "../errors.ts";
import { Deno2Bundler } from "./deno2_bundler.ts";

Deno.test("Deno2 Bundler tests", async (t) => {
  await t.step(Deno2Bundler.bundle.name, async (tt) => {
    const expectedEntrypoint = "./function.ts";
    const expectedOutFile = "./dist/bundle.ts";

    await tt.step(
      "should invoke 'deno bundle' successfully",
      async () => {
        const commandResp = {
          output: () => Promise.resolve({ code: 0 }),
        } as Deno.Command;

        const commandStub = stub(
          Deno,
          "Command",
          () => commandResp,
        );

        try {
          await Deno2Bundler.bundle(
            { entrypoint: expectedEntrypoint, outFile: expectedOutFile },
          );
          assertSpyCall(commandStub, 0, {
            args: [
              Deno.execPath(),
              {
                args: [
                  "bundle",
                  "--quiet",
                  expectedEntrypoint,
                  "--output",
                  expectedOutFile,
                ],
              },
            ],
          });
        } finally {
          commandStub.restore();
        }
      },
    );

    await tt.step(
      "should throw an exception if the 'deno bundle' command fails",
      async () => {
        const commandResp = {
          output: () =>
            Promise.resolve({
              code: 1,
              stderr: new TextEncoder().encode(
                "error: unrecognized subcommand 'bundle'",
              ),
            }),
        } as Deno.Command;

        const commandStub = stub(
          Deno,
          "Command",
          () => commandResp,
        );

        try {
          await assertRejects(
            () =>
              Deno2Bundler.bundle(
                {
                  entrypoint: expectedEntrypoint,
                  outFile: expectedOutFile,
                },
              ),
            BundleError,
            "Error bundling function file",
          );
          assertSpyCall(commandStub, 0, {
            args: [
              Deno.execPath(),
              {
                args: [
                  "bundle",
                  "--quiet",
                  expectedEntrypoint,
                  "--output",
                  expectedOutFile,
                ],
              },
            ],
          });
        } finally {
          commandStub.restore();
        }
      },
    );
  });
});
