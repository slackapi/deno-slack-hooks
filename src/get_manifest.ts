import { deepMerge, getProtocolInterface, path } from "./deps.ts";
import { getDefaultExport } from "./utilities.ts";

// Responsible for taking a working directory, and an output directory
// and placing a manifest.json in the root of the output directory

/**
 * Returns a merged manifest object from expected files used to represent an application manifest:
 * `manifest.json`, `manifest.ts` and `manifest.js`. If both a `json` and `ts`/`js` are present, then
 * these `ts`/`js` export will be merged over the `json` file.
 * @param {string} cwd - Absolute path to the root of an application.
 */
export const getManifest = async (cwd: string) => {
  let foundManifest = false;
  // deno-lint-ignore no-explicit-any
  let manifest: any = {};

  const manifestJSON = await readManifestJSONFile(path.join(
    cwd,
    "manifest.json",
  ));
  if (manifestJSON !== false) {
    manifest = deepMerge(manifest, manifestJSON);
    foundManifest = true;
  }

  // First check if there's a manifest.ts file
  const manifestTS = await readImportedManifestFile(
    path.join(cwd, "manifest.ts"),
  );
  if (manifestTS === false) {
    // Now check for a manifest.js file
    const manifestJS = await readImportedManifestFile(
      path.join(cwd, "manifest.js"),
    );
    if (manifestJS !== false) {
      manifest = deepMerge(manifest, manifestJS);
      foundManifest = true;
    }
  } else {
    manifest = deepMerge(manifest, manifestTS);
    foundManifest = true;
  }

  if (!foundManifest) {
    throw new Error(
      "Could not find a manifest.json, manifest.ts or manifest.js file",
    );
  }

  return manifest;
};

// Remove any properties in the manifest specific to the tooling that don't belong in the API payloads
// deno-lint-ignore no-explicit-any
export const cleanManifest = (manifest: any) => {
  for (const fnId in manifest.functions) {
    const fnDef = manifest.functions[fnId];
    delete fnDef.source_file;
  }

  return manifest;
};

/**
 * Reads and parses an app's `manifest.json` file, and returns its contents. If the file does not exist
 * or otherwise reading the file fails, returns `false`. If the file contents are invalid JSON, this method
 * will throw an exception.
 * @param {string} manifestJSONFilePath - Absolute path to an app's `manifest.json` file.
 */
async function readManifestJSONFile(manifestJSONFilePath: string) {
  // deno-lint-ignore no-explicit-any
  let manifestJSON: any = {};

  try {
    const { isFile } = await Deno.stat(manifestJSONFilePath);

    if (!isFile) {
      return false;
    }
  } catch (_e) {
    return false;
  }

  const jsonString = await Deno.readTextFile(manifestJSONFilePath);
  manifestJSON = JSON.parse(jsonString);

  return manifestJSON;
}

/**
 * Reads and parses an app's manifest file, and returns its contents. The file is expected to be one that the
 * deno runtime can import, and one that returns a default export. If the file does not exist otherwise reading
 * the file fails, returns `false`. If the file does not contain a default export, this method will throw and
 * exception.
 * @param {string} filename - Absolute path to an app's manifest file, to be imported by the deno runtime.
 */
async function readImportedManifestFile(filename: string) {
  // Look for manifest.[js|ts] in working directory
  // - if present, default export should be a manifest json object
  try {
    const { isFile } = await Deno.stat(filename);

    if (!isFile) {
      return false;
    }
  } catch (_e) {
    return false;
  }

  // `getDefaultExport` will throw if no default export present
  const manifest = await getDefaultExport(filename);
  if (typeof manifest != "object") {
    throw new Error(
      `Manifest file: ${filename} default export is not an object!`,
    );
  }
  return manifest;
}

if (import.meta.main) {
  const protocol = getProtocolInterface(Deno.args);
  const generatedManifest = await getManifest(Deno.cwd());
  // TODO: validate function paths
  const prunedManifest = cleanManifest(generatedManifest);
  protocol.respond(JSON.stringify(prunedManifest));
}
