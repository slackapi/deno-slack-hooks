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
    // If supported dependency file was not found, return silent failure.
    // The reason for this is that there may be any combination of supported
    // dependency files used. The only case where bubbling this up would apply
    // is if *no* dependency files were found, which, since slack.json is both
    // necessary for the project AND a dependency file, is not a valid use case.
    if (err instanceof Deno.errors.NotFound) return {};
    throw new Error(err.message, { cause: err });
  }
}
