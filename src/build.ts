import { ensureDir, parse, path } from "./deps.ts";
import { getProtocolInterface } from "./protocol/mod.ts";
import { cleanManifest, createManifest } from "./get_manifest.ts";
import type { Protocol } from "./protocol/types.ts";

export const validateAndCreateFunctions = async (
  workingDirectory: string,
  outputDirectory: string,
  // deno-lint-ignore no-explicit-any
  manifest: any,
  hookCLI: Protocol,
) => {
  // Clean output dir prior to build
  if (await removeDirectory(outputDirectory)) {
    hookCLI.log(`removed directory: ${outputDirectory}`);
  }
  // Ensure functions directory exists
  const functionsPath = path.join(outputDirectory, "functions");
  await ensureDir(functionsPath);

  // Find all the run on slack functions
  for (const fnId in manifest.functions) {
    const fnDef = manifest.functions[fnId];

    // For now we'll bundle all functions until this is available on a manifest
    // TODO: add this check back once we add it to the manifest definition
    // if (fnDef.runtime_environment !== 'slack') {
    //   continue;
    // }

    //For API type functions, there are no function files.
    if (fnDef.type === "API") {
      continue;
    }

    // Always validate function paths
    const fnFilePath = await getValidFunctionPath(
      workingDirectory,
      fnId,
      fnDef,
    );

    await createFunctionFile(
      outputDirectory,
      fnId,
      fnFilePath,
      hookCLI,
    );
  }
};

const functionPathHasDefaultExport = async (
  functionFilePath: string,
) => {
  const functionModule = await import(`file://${functionFilePath}`);
  return functionModule.default
    ? typeof functionModule.default == "function"
    : false;
};

const getValidFunctionPath = async (
  workingDirectory: string,
  fnId: string,
  // deno-lint-ignore no-explicit-any
  fnDef: any,
) => {
  if (!fnDef.source_file) {
    throw new Error(
      `Run on Slack function provided for ${fnId}, but no source_file was provided.`,
    );
  }

  const fnFilePath = path.join(workingDirectory, fnDef.source_file);

  // Make sure it's a file that exists
  try {
    const { isFile } = await Deno.stat(fnFilePath);
    if (!isFile) {
      throw new Error(`Could not find file: ${fnFilePath}`);
    }
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      throw new Error(
        `Could not find file: ${fnFilePath}. Make sure your function definition's "source_file" is relative to your project root.`,
      );
    }
    throw new Error(e);
  }

  if (!await functionPathHasDefaultExport(fnFilePath)) {
    throw new Error(
      `File: ${fnFilePath}, containing your function does not define a default export handler.`,
    );
  }
  return fnFilePath;
};

const createFunctionFile = async (
  outputDirectory: string,
  fnId: string,
  fnFilePath: string,
  hookCLI: Protocol,
) => {
  const fnFileRelative = path.join("functions", `${fnId}.js`);
  const fnBundledPath = path.join(outputDirectory, fnFileRelative);

  // We'll default to just using whatever Deno executable is on the path
  // Ideally we should be able to rely on Deno.execPath() so we make sure to bundle with the same version of Deno
  // that called this script. This is perhaps a bit overly cautious, so we can look to remove the defaulting here in the future.
  let denoExecutablePath = "deno";
  try {
    denoExecutablePath = Deno.execPath();
  } catch (e) {
    hookCLI.error("Error calling Deno.execPath()", e);
  }

  try {
    // call out to deno to handle bundling
    const p = Deno.run({
      cmd: [
        denoExecutablePath,
        "bundle",
        fnFilePath,
        fnBundledPath,
      ],
    });

    const status = await p.status();
    p.close();
    if (status.code !== 0 || !status.success) {
      throw new Error(`Error bundling function file: ${fnId}`);
    }

    hookCLI.log(`wrote function file: ${fnFileRelative}`);
  } catch (e) {
    hookCLI.error(`Error bundling function file: ${fnId}`);
    throw e;
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
  const hookCLI = getProtocolInterface(Deno.args);

  // Massage source and output directories
  let { source, output } = parse(Deno.args);
  if (!output) output = "dist";
  const outputDirectory = path.isAbsolute(output)
    ? output
    : path.join(Deno.cwd(), output);
  const workingDirectory = path.isAbsolute(source || "")
    ? source
    : path.join(Deno.cwd(), source || "");

  const generatedManifest = await createManifest(Deno.cwd(), hookCLI);
  await validateAndCreateFunctions(
    workingDirectory,
    outputDirectory,
    generatedManifest,
    hookCLI,
  );
  const prunedManifest = cleanManifest(generatedManifest);
  const manifestPath = path.join(outputDirectory, "manifest.json");
  await Deno.writeTextFile(
    manifestPath,
    JSON.stringify(prunedManifest, null, 2),
  );
  hookCLI.log(`wrote ${manifestPath}`);
}
