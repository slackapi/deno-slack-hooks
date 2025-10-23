import * as path from "jsr:@std/path@^1.0.3";
import { parseArgs } from "jsr:@std/cli@^1.0.4";
import { ensureDir } from "jsr:@std/fs@^1.0.2";
import { getProtocolInterface } from "jsr:@slack/protocols@0.0.3";
import type { Protocol } from "jsr:@slack/protocols@0.0.3/types";

import { cleanManifest, getManifest } from "./get_manifest.ts";
import { validateManifestFunctions } from "./utilities.ts";
import { Deno2Bundler, DenoBundler, EsbuildBundler } from "./bundler/mods.ts";
import { BundleError } from "./errors.ts";

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
      workingDirectory,
      outputDirectory,
      fnId,
      fnFilePath,
      protocol,
    );
  }
};

async function resolveDenoConfigPath(
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
    "Could not find a deno.json or deno.jsonc file in the current directory.",
  );
}

const createFunctionFile = async (
  workingDirectory: string,
  outputDirectory: string,
  fnId: string,
  fnFilePath: string,
  protocol: Protocol,
) => {
  const fnFileRelative = path.join("functions", `${fnId}.js`);
  const fnBundledPath = path.join(outputDirectory, fnFileRelative);

  try {
    // TODO: Remove this try/catch block once Deno 1.x is no longer supported
    await DenoBundler.bundle({
      entrypoint: fnFilePath,
      outFile: fnBundledPath,
    });
    return;
  } catch (denoBundleErr) {
    if (!(denoBundleErr instanceof BundleError)) {
      protocol.error(`Failed to bundle function "${fnId}" using Deno bundler`);
      throw denoBundleErr;
    }
    // TODO: once Protocol can handle debug add a debug statement for the error
  }

  try {
    await Deno2Bundler.bundle({
      entrypoint: fnFilePath,
      outFile: fnBundledPath,
    });
    return;
  } catch (denoBundleErr) {
    if (!(denoBundleErr instanceof BundleError)) {
      protocol.error(
        `Failed to bundle function "${fnId}" using Deno2 bundler`,
      );
      throw denoBundleErr;
    }
    // TODO: once Protocol can handle debug add a debug statement for the error
  }

  try {
    const bundle = await EsbuildBundler.bundle({
      entrypoint: fnFilePath,
      absWorkingDir: workingDirectory,
      configPath: await resolveDenoConfigPath(workingDirectory),
    });
    await Deno.writeFile(fnBundledPath, bundle);
  } catch (esbuildError) {
    protocol.error(
      `Failed to bundle function "${fnId}": Attempt with Deno bundle and esbuild - all failed`,
    );
    throw esbuildError;
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
  let { source, output } = parseArgs(Deno.args);
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
