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
  // deno-lint-ignore no-explicit-any
  bundle: async (options: EsbuildBundleOptions): Promise<any> => {
    try {
      // esbuild configuration options https://esbuild.github.io/api/#overview
      const result = await esbuild.build({
        entryPoints: [options.entrypoint],
        platform: "browser",
        target: "deno1", // TODO: the versions should come from the user defined input
        format: "esm", // esm format stands for "ECMAScript module"
        bundle: true, // inline any imported dependencies into the file itself
        absWorkingDir: options.absWorkingDir,
        write: false, // Favor returning the contents
        outdir: "out", // Nothing is being written to file here
        metafile: true,
        plugins: [
          ...denoPlugins({ configPath: options.configPath }),
        ],
      });
      return result;
    } finally {
      esbuild.stop();
    }
  },
};
