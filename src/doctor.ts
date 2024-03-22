import { getProtocolInterface } from "./deps.ts";
import { isNewSemverRelease } from "./utilities.ts";

type RuntimeVersion = {
  name: string;
  current: string;
} & RuntimeDetails;

type RuntimeDetails = {
  message?: string;
  error?: {
    message: string;
  };
};

const getHostedDenoRuntimeVersion = async (): Promise<RuntimeDetails> => {
  try {
    const metadataURL = "https://api.slack.com/slackcli/metadata.json";
    const response = await fetch(metadataURL);
    if (!response.ok || response.status !== 200) {
      throw new Error(
        `Failed to collect upstream CLI metadata - ${response.status}`,
      );
    }
    const metadata = await response.json();
    const version = metadata?.["deno-runtime"]?.releases[0]?.version;
    if (!version) {
      throw new Error("Failed to find the minimum Deno version");
    }
    const message = Deno.version.deno !== version
      ? `Applications deployed to Slack use Deno version ${version}`
      : undefined;
    if (isNewSemverRelease(Deno.version.deno, version)) {
      return {
        message,
        error: { message: "The installed runtime version is not supported" },
      };
    }
    return { message };
  } catch (err) {
    if (err instanceof Error) {
      return { error: { message: err.message } };
    }
    return { error: { message: err } };
  }
};

export const getRuntimeVersions = async (): Promise<{
  versions: RuntimeVersion[];
}> => {
  const hostedDenoRuntimeVersion = await getHostedDenoRuntimeVersion();
  const versions = [
    {
      "name": "deno",
      "current": Deno.version.deno,
      ...hostedDenoRuntimeVersion,
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
  const prunedDoctor = await getRuntimeVersions();
  protocol.respond(JSON.stringify(prunedDoctor));
}
