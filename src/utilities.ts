import { parse } from "https://deno.land/std@0.149.0/encoding/jsonc.ts";
import { JSONValue } from "./deps.ts";

/**
 * getJSON attempts to read the given file. If successful,
 * it returns the contents of the file. If the extraction
 * fails, it returns an empty object.
 */
export async function getJSON(file: string): Promise<JSONValue> {
  try {
    const fileContents = await Deno.readTextFile(file);
    return parse(fileContents);
  } catch (err) {
    throw new Error(err.message, { cause: err });
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
    throw new Error(`No default export handler in file: ${functionFilePath}`);
  }
  return functionModule.default;
}
