import {
  ensureDir,
  getProtocolInterface,
  parseCLIArguments,
  path,
} from "./deps.ts";
import type { Protocol } from "./deps.ts";
import { cleanManifest, getManifest } from "./get_manifest.ts";
import { validateManifestFunctions } from "./utilities.ts";
import { DenoBundler, EsbuildBundler, DenoInfo, DenoVendor } from "./bundler/mods.ts";
import { BundleError } from "./errors.ts";

// [@mniemer prototype for non-bundled executable]
// This build script has been updated in the following ways:
// - instead of running `deno build` or `esbuild` on function files, run `deno info` on each function file to discover all relevant src code
// - copy import_map.json to the output dir in addition to deno.jsonc so the `deno vendor` command can work
// - do not strip fn.source_file from the generated manifest, since deno-slack-runtime will need that at runtime to dispatch payloads to correct fn def
// - run deno `deno vendor` on all src files to cache remote deps in vendor subdir

export const validateAndCopyFunctions = async (
  workingDirectory: string,
  outputDirectory: string,
  // deno-lint-ignore no-explicit-any
  manifest: any,
  protocol: Protocol,
): Promise<Array<string>> => {
  // Ensure manifest and function userland exists and is valid
  await validateManifestFunctions(
    workingDirectory,
    manifest,
  );

  const srcCodeFilesToCopy = new Set<string>();
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

    // Get set of local src files for function
    const fnSrcCodeFiles = await getFunctionSourceCodeFiles(workingDirectory, outputDirectory, fnFilePath);
    for (const srcFile of fnSrcCodeFiles) {
      srcCodeFilesToCopy.add(srcFile);
    }
  }

  // Write src files to disk
  const outputFileSpecifiers = new Array<string>();
  for (const absSrcPath of srcCodeFilesToCopy) {
    const absDstPath = absSrcPath.replace(workingDirectory, outputDirectory);
    await ensureDir(path.dirname(absDstPath));
    await Deno.copyFile(absSrcPath, absDstPath);
    outputFileSpecifiers.push(absDstPath);
  }
  return outputFileSpecifiers;
};

async function resolveFilePath(
  possibleFileNames: string[],
  directory: string = Deno.cwd(),
): Promise<string> {
  for(const name of possibleFileNames) {
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
    `Could not find a file with one of names [${possibleFileNames.join(', ')}] in the current directory.`,
  );
}

async function resolveImportMapPath(
  directory: string = Dwno.cwd()
): Promise<string> {
  return await resolveFilePath(["import_map.json"], directory)
}

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
    `Could not find a deno.json or deno.jsonc file in the current directory.`,
  );
}

const getFunctionSourceCodeFiles = async (
  workingDirectory: string,
  outputDirectory: string,
  fnFilePath: string,
): Promise<Set<string>> => {
  // run deno info to get set of relevant local src files imported in function
  const fnMetadata = await DenoInfo.info(fnFilePath);
  
  const fnSourceCodeFiles = new Set<string>();
  for (const mod of fnMetadata.modules) {
    const absPath = mod.specifier;
    if (absPath != null && absPath.startsWith("file://")) {
      fnSourceCodeFiles.add(absPath.replace("file://", ""));
    }
  }
  return fnSourceCodeFiles;
}

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
  await ensureDir(outputDirectory);

  const workingDirectory = path.isAbsolute(source || "")
    ? source
    : path.join(Deno.cwd(), source || "");

  // get manifest & write to output dir
  const generatedManifest = await getManifest(Deno.cwd());
  const manifestPath = path.join(outputDirectory, "manifest.json");
  await Deno.writeTextFile(
    manifestPath,
    JSON.stringify(generatedManifest, null, 2),
  );

  // copy src functions & deps to output dir
  const outputFileSpecifiers = await validateAndCopyFunctions(
    workingDirectory,
    outputDirectory,
    generatedManifest,
    protocol,
  );

  // copy deno.jsonc to output dir
  const denoConfigPath = await resolveDenoConfigPath(workingDirectory);
  await Deno.copyFile(denoConfigPath, path.join(outputDirectory, "deno.jsonc"));

  // copy import_map.json to output dir
  const importMapPath = await resolveImportMapPath(workingDirectory);
  await Deno.copyFile(importMapPath, path.join(outputDirectory, "import_map.json"));

  // vendorize remote dependencies in output dir
  await DenoVendor.vendor(outputDirectory, outputFileSpecifiers);
}
