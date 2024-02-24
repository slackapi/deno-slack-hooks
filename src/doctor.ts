import { getProtocolInterface } from "./deps.ts";

type ExecutionTool = {
  name: string;
  current: string;
  minimum?: string;
};

export const getExecutionEnvironment = (): {
  versions: ExecutionTool[];
} => {
  const versions = [
    {
      "name": "deno",
      "current": Deno.version.deno,
      "minimum": "1.20.5",
    },
    {
      "name": "typescript",
      "current": Deno.version.typescript,
    },
    {
      "name": "v8",
      "current": Deno.version.v8,
    },
  ];
  return { versions };
};

if (import.meta.main) {
  const protocol = getProtocolInterface(Deno.args);
  const prunedDoctor = getExecutionEnvironment();
  protocol.respond(JSON.stringify(prunedDoctor));
}
