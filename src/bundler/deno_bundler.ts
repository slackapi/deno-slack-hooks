import { BundleError } from "../errors.ts";

type DenoBundleOptions = {
  /** The path to the file being bundled */
  entrypoint: string;
  /** The path where the bundled file should be written. */
  outFile: string;
};

export const DenoBundler = {
  bundle: async (options: DenoBundleOptions): Promise<void> => {
    // call out to deno to handle bundling
    const command = new Deno.Command(Deno.execPath(), {
      args: [
        "bundle",
        "--quiet",
        options.entrypoint,
        options.outFile,
      ],
    });

    const { code, stderr } = await command.output();
    if (code !== 0) {
      throw new BundleError({
        cause: new TextDecoder().decode(stderr),
      });
    }
  },
};
