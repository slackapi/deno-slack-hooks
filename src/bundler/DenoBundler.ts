import { Bundler } from "./types.ts";

export type DenoBundlerOptions = {
  /** The path to the file being bundled */
  entrypoint: string;
  /** The path to the deno.json / deno.jsonc config file. */
  fnBundledPath: string;
};

export class DenoBundler implements Bundler {
  constructor(private options: DenoBundlerOptions) {}

  async bundle(): Promise<void> {
    // call out to deno to handle bundling
    const command = new Deno.Command(Deno.execPath(), {
      args: [
        "bundle",
        "--quiet",
        this.options.entrypoint,
        this.options.fnBundledPath,
      ],
    });

    const { code, stderr } = await command.output();
    if (code !== 0 || stderr) {
      throw new Error(`Error bundling function file`, { cause: stderr });
    }
  }
}
