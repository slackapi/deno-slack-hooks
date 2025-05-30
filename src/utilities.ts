import * as path from "jsr:@std/path@^1.0.3";
import { parse as parseJSONC } from "jsr:@std/jsonc@^1.0.1";
import type { JsonValue } from "jsr:@std/jsonc@^1.0.1";

/**
 * getJSON attempts to read the given file. If successful,
 * it returns the contents of the file. If the extraction
 * fails, it returns an empty object.
 */
export async function getJSON(file: string): Promise<JsonValue> {
  try {
    const fileContents = await Deno.readTextFile(file);
    return parseJSONC(fileContents);
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(err.message, { cause: err });
    }
    throw new Error(String(err));
  }
}

/**
 * Imports the provided file path and returns its default export. Throws an exception if the module
 * has no default export.
 * @param {string} functionFilePath - Absolute file path to an importable ECMAScript module
 */
export async function getDefaultExport(
  functionFilePath: string,
  // deno-lint-ignore no-explicit-any
): Promise<any> {
  const functionModule = await import(`file://${functionFilePath}`);
  if (!functionModule.default) {
    throw new Error(`File: ${functionFilePath} has no default export!`);
  }
  return functionModule.default;
}

/**
 * Performs basic validation on all function definitions in a manifest; if any definition fails
 * validation, an exception will be thrown.
 * @param {string} applicationRoot - Absolute path to application root directory.
 * @param {any} manifest - An object representing the application manifest. Should contain a `functions` key that is a map of function IDs to function definitions.
 */
export async function validateManifestFunctions(
  applicationRoot: string,
  // deno-lint-ignore no-explicit-any
  manifest: any,
): Promise<void> {
  for (const fnId in manifest.functions) {
    const fnDef = manifest.functions[fnId];
    // For API type functions, there are no function files.
    if (fnDef.type === "API") {
      continue;
    }

    // Ensure source_file for this function definition exists
    if (!fnDef.source_file) {
      throw new Error(
        `No source_file property provided for function with ID ${fnId}!`,
      );
    }
    const fnFilePath = path.join(applicationRoot, fnDef.source_file);
    try {
      const { isFile } = await Deno.stat(fnFilePath);
      if (!isFile) {
        throw new Error(
          `Could not find source_file: ${fnFilePath} for function with ID ${fnId}!`,
        );
      }
    } catch (e) {
      if (e instanceof Deno.errors.NotFound) {
        throw new Error(
          `Could not find file: ${fnFilePath}. Make sure the function definition with ID ${fnId}'s source_file is relative to your project root.`,
        );
      }
      throw e;
    }

    // The following line throws an exception if the file path does not contain a default export.
    const defaultExport = await getDefaultExport(fnFilePath);
    if (typeof defaultExport !== "function") {
      throw new Error(
        `The function with ID ${fnId} located at ${fnFilePath}'s default export is not a function!`,
      );
    }
  }
}

/**
 * isNewSemverRelease takes two semver formatted strings
 * and compares them to see if the second argument is a
 * newer version than the first argument.
 * If it's newer it returns true, otherwise returns false.
 */
export const isNewSemverRelease = (current: string, target: string) => {
  const [currMajor, currMinor, currPatch] = current
    .split(".")
    .map((val) => Number(val));
  const [targetMajor, targetMinor, targetPatch] = target
    .split(".")
    .map((val) => Number(val));

  if (targetMajor !== currMajor) return targetMajor > currMajor;
  if (targetMinor !== currMinor) return targetMinor > currMinor;
  return targetPatch > currPatch;
};
