export type DenoBundlerOptions = {
  /** The path to the file being bundled */
  entrypoint: string;
  /** The path to the deno.json / deno.jsonc config file. */
  fnBundledPath: string;
};

export const DenoBundler = {
  bundle: async (options: DenoBundlerOptions): Promise<void> => {
    // call out to deno to handle bundling
    const command = new Deno.Command(Deno.execPath(), {
      args: [
        "bundle",
        "--quiet",
        options.entrypoint,
        options.fnBundledPath,
      ],
    });

    const { code, stderr } = await command.output();
    if (code !== 0) {
      throw new Error("Error bundling function file", {
        cause: new TextDecoder().decode(stderr),
      });
    }
  },
};
