import { denoPlugins, esbuild } from "../deps.ts";
import { Bundler } from "./types.ts";

export type EsbuildBundlerOptions = {
  /** The path to the file being bundled */
  entrypoint: string;
  /** The path to the deno.json / deno.jsonc config file. */
  configPath: string;
  /** specify the working directory to use for the build */
  absWorkingDir: string;
};

export class EsbuildBundler implements Bundler {
  constructor(private options: EsbuildBundlerOptions) {}

  async bundle(): Promise<Uint8Array> {
    try {
      // esbuild configuration options https://esbuild.github.io/api/#overview
      const result = await esbuild.build({
        entryPoints: [this.options.entrypoint],
        platform: "neutral",
        target: "deno1",
        format: "esm", // esm format stands for "ECMAScript module"
        bundle: true, // inline any imported dependencies into the file itself
        treeShaking: true, // dead code elimination, removes unreachable code
        minify: true, // the generated code will be minified instead of pretty-printed
        sourcemap: "inline", // source map is appended to the end of the .js output file
        absWorkingDir: this.options.absWorkingDir,
        write: false, // Favor returning the contents
        outdir: "out", // Nothing is being written to file here
        plugins: [
          ...denoPlugins({ configPath: this.options.configPath }),
        ],
      });
      return result.outputFiles[0].contents;
    } finally {
      esbuild.stop();
    }
  }
}
