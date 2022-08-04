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
