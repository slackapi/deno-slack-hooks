/**
 * getJSON attempts to read the given file. If successful,
 * it returns an object of the contained JSON. If the extraction
 * fails, it returns an empty object.
 */
export async function getJSON(file: string) {
  try {
    return JSON.parse(await Deno.readTextFile(file));
  } catch (_) {
    // TODO :: This needs to be updated to bubble up the case
    // where the file doesn't exist. Doing so requires
    // refactoring `check-update` and `install-update`
    // to accommodate the adjustment.
    return {};
  }
}
