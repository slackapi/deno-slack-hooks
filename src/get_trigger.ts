import { getProtocolInterface, parse, path } from "./deps.ts";

export const getTrigger = async (args: string[]) => {
  const source = parse(args).source as string;

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
    return readTSFile(path);
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      throw new Error("Trigger Definition file cannot be found");
    }
    throw e;
  }
};

const readJSONFile = async (path: string) => {
  try {
    const jsonString = await Deno.readTextFile(path);
    return JSON.parse(jsonString);
  } catch (e) {
    throw e;
  }
};

const readTSFile = async (path: string) => {
  const file = await import(`file://${path}`);
  if (file && !file.default) {
    throw new Error(
      `The Trigger Definition at ${path} isn't being exported by default`,
    );
  }
  return file.default;
};

if (import.meta.main) {
  const hookCLI = getProtocolInterface(Deno.args);
  hookCLI.respond(
    JSON.stringify(await getTrigger(Deno.args)),
  );
}
