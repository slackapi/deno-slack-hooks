import {
  JSONValue,
  parse,
} from "https://deno.land/std@0.149.0/encoding/jsonc.ts";

// Export alias to avoid having to import the above elsewhere
export type JSONCValue = JSONValue;

/**
 * getJSON attempts to read the given file. If successful,
 * it returns the contents of the file. If the extraction
 * fails, it returns an empty object.
 */
export async function getJSON(file: string): Promise<JSONCValue> {
  try {
    const fileContents = await Deno.readTextFile(file);
    return parse(fileContents);
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      // TODO :: This needs to be updated to bubble up the case
      // where the file doesn't exist. Doing so requires
      // refactoring `check-update` and `install-update`
      // to accommodate the adjustment.
    }
    return {};
  }
}
