import { deepMerge, getProtocolInterface, path } from "./deps.ts";

// Responsible for taking a working directory, and an output directory
// and placing a manifest.json in the root of the output directory

export const createManifest = async (cwd: string) => {
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

async function readImportedManifestFile(filename: string) {
  // Look for manifest.[js|ts] in working directory
  // - if present, default export should be a manifest json object
  // deno-lint-ignore no-explicit-any
  let manifestJS: any = {};

  try {
    const { isFile } = await Deno.stat(filename);

    if (!isFile) {
      return false;
    }
  } catch (_e) {
    return false;
  }

  const manifestJSFile = await import(`file://${filename}`);
  if (manifestJSFile && manifestJSFile.default) {
    manifestJS = manifestJSFile.default;
  }

  return manifestJS;
}

if (import.meta.main) {
  const hookCLI = getProtocolInterface(Deno.args);
  const generatedManifest = await createManifest(Deno.cwd());
  const prunedManifest = cleanManifest(generatedManifest);
  hookCLI.respond(JSON.stringify(prunedManifest));
}
