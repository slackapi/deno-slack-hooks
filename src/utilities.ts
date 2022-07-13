/**
 * getJSON attempts to read the given file. If successful,
 * it returns an object of the contained JSON. If the extraction
 * fails, it returns an empty object.
 */
export async function getJSON(file: string) {
  try {
    return JSON.parse(await Deno.readTextFile(file));
  } catch (_) {
    return {};
  }
}
