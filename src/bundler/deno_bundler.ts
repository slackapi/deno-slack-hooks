import { BundleError } from "../errors.ts";

export type DenoBundleOptions = {
  /** The path to the file being bundled */
  entrypoint: string;
  /** The path to the deno.json / deno.jsonc config file. */
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
