import {
  ensureDir,
  getProtocolInterface,
  parseCLIArguments,
  path,
} from "./deps.ts";
import type { Protocol } from "./deps.ts";
import { cleanManifest, getManifest } from "./get_manifest.ts";
import { validateManifestFunctions } from "./utilities.ts";
import * as esbuild from "https://deno.land/x/esbuild@v0.19.4/mod.js";
import { denoPlugins } from "https://deno.land/x/esbuild_deno_loader@0.8.2/mod.ts";

export const validateAndCreateFunctions = async (
  workingDirectory: string,
  outputDirectory: string,
  // deno-lint-ignore no-explicit-any
  manifest: any,
  protocol: Protocol,
) => {
  // Ensure functions output directory exists
  const functionsPath = path.join(outputDirectory, "functions");
  await ensureDir(functionsPath);

  // Ensure manifest and function userland exists and is valid
  await validateManifestFunctions(
    workingDirectory,
    manifest,
  );

  // Write out functions to disk
  for (const fnId in manifest.functions) {
    const fnDef = manifest.functions[fnId];
    // For API type functions, there are no function files.
    if (fnDef.type === "API") {
      continue;
    }
    const fnFilePath = path.join(
      workingDirectory,
      fnDef.source_file,
    );
    await createFunctionFile(
      outputDirectory,
      fnId,
      fnFilePath,
      protocol,
    );
  }
};

async function solveDenoConfigPath(
  directory: string = Deno.cwd(),
): Promise<string> {
  for (const name of ["deno.json", "deno.jsonc"]) {
    const denoConfigPath = path.join(directory, name);
    try {
      await Deno.stat(denoConfigPath);
      return denoConfigPath;
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) {
        throw error;
      }
    }
  }
  throw new Error(
    `Could not find a deno.json file in the current directory.`,
  );
}

const createFunctionFile = async (
  outputDirectory: string,
  fnId: string,
  fnFilePath: string,
  protocol: Protocol,
) => {
  const fnFileRelative = path.join("functions", `${fnId}.js`);
  const fnBundledPath = path.join(outputDirectory, fnFileRelative);
  await esbuild.initialize({});
  try {
    protocol.log(fnFilePath);
    protocol.log(`${Deno.cwd()}/import_map.json`);
    // esbuild configuration options https://esbuild.github.io/api/#overview
    const result = await esbuild.build({
      entryPoints: [fnFilePath],
      platform: "neutral",
      target: "es2020",
      format: "esm",
      bundle: true,
      splitting: true,
      treeShaking: true,
      minify: true,
      sourcemap: true,
      absWorkingDir: Deno.cwd(),
      write: false,
      outdir: "out",
      plugins: [
        ...denoPlugins({ configPath: await solveDenoConfigPath() }),
      ],
    });
    await Deno.writeFile(fnBundledPath, result.outputFiles[0].contents);
  } catch (e) {
    protocol.error(`Error bundling function file: ${fnId}`);
    throw e;
  } finally {
    esbuild.stop();
  }
};

/**
 * Recursively deletes the specified directory.
 *
 * @param directoryPath the directory to delete
 * @returns true when the directory is deleted or throws unexpected errors
 */
async function removeDirectory(directoryPath: string): Promise<boolean> {
  try {
    await Deno.remove(directoryPath, { recursive: true });
    return true;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return false;
    }

    throw err;
  }
}

if (import.meta.main) {
  const protocol = getProtocolInterface(Deno.args);

  // Massage source and output directories
  let { source, output } = parseCLIArguments(Deno.args);
  if (!output) output = "dist";
  const outputDirectory = path.isAbsolute(output)
    ? output
    : path.join(Deno.cwd(), output);

  // Clean output dir prior to build
  await removeDirectory(outputDirectory);

  const workingDirectory = path.isAbsolute(source || "")
    ? source
    : path.join(Deno.cwd(), source || "");

  const generatedManifest = await getManifest(Deno.cwd());
  await validateAndCreateFunctions(
    workingDirectory,
    outputDirectory,
    generatedManifest,
    protocol,
  );
  const prunedManifest = cleanManifest(generatedManifest);
  const manifestPath = path.join(outputDirectory, "manifest.json");
  await Deno.writeTextFile(
    manifestPath,
    JSON.stringify(prunedManifest, null, 2),
  );
}
