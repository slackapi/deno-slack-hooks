import {
  ensureDir,
  getProtocolInterface,
  parseCLIArguments,
  path,
} from "./deps.ts";
import type { Protocol } from "./deps.ts";
import { cleanManifest, getManifest } from "./get_manifest.ts";
import { validateManifestFunctions } from "./utilities.ts";

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

const createFunctionFile = async (
  outputDirectory: string,
  fnId: string,
  fnFilePath: string,
  protocol: Protocol,
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
    protocol.error("Error calling Deno.execPath()", e);
  }

  try {
    // call out to deno to handle bundling
    const commander = new Deno.Command(denoExecutablePath, {
      args: [
        "bundle",
        "--quiet",
        fnFilePath,
        fnBundledPath,
      ],
    });

    const subprocess = commander.spawn();
    const status = await subprocess.status;
    subprocess.kill();

    if (status.code !== 0 || !status.success) {
      throw new Error(`Error bundling function file: ${fnId}`);
    }
  } catch (e) {
    protocol.error(`Error bundling function file: ${fnId}`);
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
