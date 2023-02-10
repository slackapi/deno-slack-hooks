import { parse, path } from "./deps.ts";
import { getProtocolInterface, Protocol } from "./deps.ts";

const getTrigger = async (args: string[], walkieTalkie: Protocol) => {
  const source = parse(args).source as string;

  if (!source) throw new Error("A source path needs to be defined");

  const fullPath = path.isAbsolute(source)
    ? source
    : path.join(Deno.cwd(), source || "");

  return await readFile(fullPath, walkieTalkie);
};

const readFile = async (path: string, walkieTalkie: Protocol) => {
  try {
    const { isFile } = await Deno.stat(path);
    if (!isFile) throw new Error("The specified source is not a valid file.");
    if (path.endsWith(".json")) return readJSONFile(path);
    return readTSFile(path, walkieTalkie);
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

const readTSFile = async (path: string, walkieTalkie: Protocol) => {
  if (walkieTalkie.install) walkieTalkie.install();
  const file = await import(`file://${path}`);
  if (walkieTalkie.uninstall) walkieTalkie.uninstall();
  if (file && !file.default) {
    throw new Error(
      `The Trigger Definition at ${path} isn't being exported by default`,
    );
  }
  return file.default;
};

if (import.meta.main) {
  const walkieTalkie = getProtocolInterface(Deno.args);
  walkieTalkie.respond(
    JSON.stringify(await getTrigger(Deno.args, walkieTalkie)),
  );
}
