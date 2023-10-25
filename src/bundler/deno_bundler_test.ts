import { assertRejects, assertSpyCalls, stub } from "../dev_deps.ts";
import { BundleError } from "../errors.ts";
import { DenoBundler } from "./deno_bundler.ts";

Deno.test("Deno Bundler tests", async (t) => {
  await t.step(DenoBundler.bundle.name, async (tt) => {
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
            { entrypoint: "./function.ts", outFile: "./dist/bundle.ts" },
          );
          assertSpyCalls(commandStub, 1);
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
                  entrypoint: "./function.ts",
                  outFile: "./dist/bundle.ts",
                },
              ),
            BundleError,
            "Error bundling function file",
          );
          assertSpyCalls(commandStub, 1);
        } finally {
          commandStub.restore();
        }
      },
    );
  });
});
