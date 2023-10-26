import { assertRejects, assertSpyCall, stub } from "../dev_deps.ts";
import { BundleError } from "../errors.ts";
import { DenoBundler } from "./deno_bundler.ts";

Deno.test("Deno Bundler tests", async (t) => {
  await t.step(DenoBundler.bundle.name, async (tt) => {
    const expectedEntrypoint = "./function.ts";
    const expectedOutFile = "./dist/bundle.ts";

    await tt.step(
      "should invoke 'deno bundle' successfully",
      async () => {
        const commandResp = {
          output: () => Promise.resolve({ code: 0 }),
        } as Deno.Command;

        // Stub out call to `Deno.Command` and fake return a success
        const commandStub = stub(
          Deno,
          "Command",
          () => commandResp,
        );

        try {
          await DenoBundler.bundle(
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

        // Stub out call to `Deno.Command` and fake return a success
        const commandStub = stub(
          Deno,
          "Command",
          () => commandResp,
        );

        try {
          await assertRejects(
            () =>
              DenoBundler.bundle(
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
