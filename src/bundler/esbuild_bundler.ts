import { denoPlugins, esbuild } from "../deps.ts";

type EsbuildBundleOptions = {
  /** The path to the file being bundled */
  entrypoint: string;
  /** The path to the deno.json / deno.jsonc config file. */
  configPath: string;
  /** specify the working directory to use for the build */
  absWorkingDir: string;
};

export const EsbuildBundler = {
  bundle: async (options: EsbuildBundleOptions): Promise<Uint8Array> => {
    try {
      // esbuild configuration options https://esbuild.github.io/api/#overview
      const result = await esbuild.build({
        entryPoints: [options.entrypoint],
        platform: "browser",
        // TODO: the versions should come from the user defined input
        target: "deno1",
        format: "esm", // esm format stands for "ECMAScript module"
        bundle: true, // inline any imported dependencies into the file itself
        absWorkingDir: options.absWorkingDir,
        write: false, // Favor returning the contents
        outdir: "out", // Nothing is being written to file here
        plugins: [
          ...denoPlugins({ configPath: options.configPath }),
        ],
      });
      return result.outputFiles[0].contents;
    } finally {
      esbuild.stop();
    }
  },
};
