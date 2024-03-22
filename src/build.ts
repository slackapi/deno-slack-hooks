import {
  ensureDir,
  fmt,
  getProtocolInterface,
  parseCLIArguments,
  path,
} from "./deps.ts";
import type { Protocol } from "./deps.ts";
import { cleanManifest, getManifest } from "./get_manifest.ts";
import { validateManifestFunctions } from "./utilities.ts";
import {
  DenoBundler,
  EsbuildBundler,
  DenoInfo,
} from "./bundler/mods.ts";
import { BundleError } from "./errors.ts";
import { ensureFile } from "https://deno.land/std@0.134.0/fs/ensure_file.ts";

export const validateAndCreateFunctions = async (
  workingDirectory: string,
  outputBundleDirectory: string,
  outputRawDirectory: string,
  // deno-lint-ignore no-explicit-any
  manifest: any,
  protocol: Protocol,
) => {
  // Ensure functions output directory exists
  const functionsPath = path.join(outputBundleDirectory, "functions");
  await ensureDir(functionsPath);
  await ensureDir(outputRawDirectory);

  // Ensure manifest and function userland exists and is valid
  await validateManifestFunctions(
    workingDirectory,
    manifest,
  );

  // Write out functions to disk
  const srcFilesToCopy = new Set<string>();
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
      outputBundleDirectory,
      fnId,
      fnFilePath,
      protocol,
    );

    // compile list of relevant src files to copy
    const fnSrcCodeFiles = await getFunctionSourceCodeFiles(workingDirectory, fnFilePath);
    for (const srcFile of fnSrcCodeFiles) {
      srcFilesToCopy.add(srcFile);
    }
  }

  // Write src files to second raw output dir, then let the CLI zip and upload
  for (const absSrcPath of srcFilesToCopy) {
    const absDstPath = absSrcPath.replace(workingDirectory, outputRawDirectory);
    await ensureDir(path.dirname(absDstPath));
    await Deno.copyFile(absSrcPath, absDstPath);
  }

  // also copy import_map.json to second raw output dir
  const importMapPath = await resolveImportMapPath(workingDirectory);
  await Deno.copyFile(importMapPath, path.join(outputRawDirectory, "import_map.json"));
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
  return await resolveFilePath(["import_map.json"], directory);
}

async function resolveDenoConfigPath(
  directory: string = Deno.cwd(),
): Promise<string> {
  return await resolveFilePath(["deno.json", "deno.jsonc"], directory);
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
    await DenoBundler.bundle({
      entrypoint: fnFilePath,
      outFile: fnBundledPath,
    });
  } catch (denoBundleErr) {
    if (!(denoBundleErr instanceof BundleError)) {
      protocol.error(`Error bundling function file "${fnId}" with Deno`);
      throw denoBundleErr;
    }

    // TODO: once Protocol can handle debug add a debug statement here

    try {
      const bundle = await EsbuildBundler.bundle({
        entrypoint: fnFilePath,
        absWorkingDir: workingDirectory,
        configPath: await resolveDenoConfigPath(workingDirectory),
      });
      await Deno.writeFile(fnBundledPath, bundle);
    } catch (esbuildError) {
      protocol.error(`Error bundling function file "${fnId}" with esbuild`);
      throw esbuildError;
    }
  }
};

const getFunctionSourceCodeFiles = async (
  workingDirectory: string,
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

async function writeManifest(prunedManifest: any, manifestPath: string) {
  await Deno.writeTextFile(
    manifestPath,
    JSON.stringify(prunedManifest, null, 2),
  );
}

function getAbsoluteDirectory(directoryPath: string): string {
  return path.isAbsolute(directoryPath)
    ? directoryPath
    : path.join(Deno.cwd(), directoryPath);
}

/**
 * Recursively compiles set of local file paths imported in the specified function.
 */
function getSourceFilesImported(
  relativeFnFilePath: string,
  // deno-lint-ignore no-explicit-any
  metafile: any,
  local_files: Set<string>,
): Set<string> {
  const root = metafile.inputs[relativeFnFilePath];

  for (const imported of root.imports) {
    if (imported.external || imported.path.startsWith("http")) {
      // skip any external imports
      fmt.printf("skipping %v, external\n", imported.path);
      continue;
    }
    if (local_files.has(imported.path)) {
      fmt.printf("skipping %v, already in set", imported.path);
      continue;
    }
    local_files.add(imported.path);
    const sub_files = getSourceFilesImported(
      imported.path,
      metafile,
      local_files,
    );
    for (const sub of sub_files) {
      local_files.add(sub);
    }
  }

  return local_files;
}

if (import.meta.main) {
  const protocol = getProtocolInterface(Deno.args);

  // Massage source and output directories
  let { source, outputBundle, outputCopy } = parseCLIArguments(Deno.args);

  if (!outputBundle) outputBundle = "dist";
  const outputBundleDirectory = getAbsoluteDirectory(outputBundle);

  if (!outputCopy) outputCopy = "dist-copy";
  const outputRawDirectory = getAbsoluteDirectory(outputCopy);

  // Clean output dirs prior to build
  await removeDirectory(outputBundleDirectory);
  await removeDirectory(outputRawDirectory);

  const workingDirectory = path.isAbsolute(source || "")
    ? source
    : path.join(Deno.cwd(), source || "");

  const generatedManifest = await getManifest(Deno.cwd());
  await validateAndCreateFunctions(
    workingDirectory,
    outputBundleDirectory,
    outputRawDirectory,
    generatedManifest,
    protocol,
  );
  const prunedManifest = cleanManifest(generatedManifest);
  await writeManifest(
    prunedManifest,
    path.join(outputBundleDirectory, "manifest.json"),
  );
  await writeManifest(
    prunedManifest,
    path.join(outputRawDirectory, "manifest.json"),
  );
}
