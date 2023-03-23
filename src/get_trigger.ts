import { getProtocolInterface, parseCLIArguments, path } from "./deps.ts";
import { getDefaultExport } from "./utilities.ts";

export const getTrigger = async (args: string[]) => {
  const source = parseCLIArguments(args).source as string;

  if (!source) throw new Error("A source path needs to be defined");

  const fullPath = path.isAbsolute(source)
    ? source
    : path.join(Deno.cwd(), source || "");

  return await readFile(fullPath);
};

const readFile = async (path: string) => {
  try {
    const { isFile } = await Deno.stat(path);
    if (!isFile) throw new Error("The specified source is not a valid file.");
    if (path.endsWith(".json")) return readJSONFile(path);
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      throw new Error("Trigger Definition file cannot be found");
    }
    throw e;
  }
  // `getDefaultExport` will throw if no default export exists in module
  const trigger = await getDefaultExport(path);
  if (typeof trigger != "object") {
    throw new Error(`Trigger file: ${path} default export is not an object!`);
  }
  return trigger;
};

const readJSONFile = async (path: string) => {
  const jsonString = await Deno.readTextFile(path);
  return JSON.parse(jsonString);
};

if (import.meta.main) {
  const protocol = getProtocolInterface(Deno.args);
  protocol.respond(
    JSON.stringify(await getTrigger(Deno.args)),
  );
}
