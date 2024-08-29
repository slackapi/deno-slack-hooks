import { getProtocolInterface } from "https://deno.land/x/deno_slack_protocols@0.0.2/mod.ts";
import * as path from "jsr:@std/path@^1.0.3";
import { deepMerge } from "jsr:@std/collections@^1.0.5";

import { getDefaultExport, validateManifestFunctions } from "./utilities.ts";

// Responsible for taking a working directory, and an output directory
// and placing a manifest.json in the root of the output directory

/**
 * Returns a merged manifest object from expected files used to represent an application manifest:
 * `manifest.json`, `manifest.ts` and `manifest.js`. If both a `json` and `ts` _or_ `js` are present,
 * then first the `json` file will be used as a base object, then the `.ts` or the `.js` file export
 * will be merged over the `json` file. If a `.ts` file exists, the `.js` will be ignored. Otherwise,
 * the `.js` file will be merged over the `.json`.
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

/**
 * Retrieves a merged application manifest, validates the manifest and all its specified functions,
 * and cleans up any bits from it not relevant for the Slack manifest APIs.
 * @param {string} applicationRoot - An absolute path to the application root, which presumably contains manifest files.
 */
export async function getValidateAndCleanManifest(applicationRoot: string) {
  const generatedManifest = await getManifest(applicationRoot);
  await validateManifestFunctions(applicationRoot, generatedManifest);
  return cleanManifest(generatedManifest);
}

if (import.meta.main) {
  const protocol = getProtocolInterface(Deno.args);
  const prunedManifest = await getValidateAndCleanManifest(Deno.cwd());
  protocol.respond(JSON.stringify(prunedManifest));
}
