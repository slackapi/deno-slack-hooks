import { getProtocolInterface } from "https://deno.land/x/deno_slack_protocols@0.0.2/mod.ts";
import type { Protocol } from "https://deno.land/x/deno_slack_protocols@0.0.2/types.ts";

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

const getHostedDenoRuntimeVersion = async (
  protocol: Protocol,
): Promise<RuntimeDetails> => {
  try {
    const metadataURL = "https://api.slack.com/slackcli/metadata.json";
    const response = await fetch(metadataURL);
    if (!response.ok || response.status !== 200) {
      protocol.warn("Failed to collect upstream CLI metadata:");
      protocol.warn(response);
      return {};
    }
    const metadata = await response.json();
    const version = metadata?.["deno-runtime"]?.releases[0]?.version;
    if (!version) {
      const details = JSON.stringify(metadata, null, "  ");
      protocol.warn(
        "Failed to find the minimum Deno version in the upstream CLI metadata response:",
      );
      protocol.warn(details);
      return {};
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
    protocol.warn("Failed to collect or process upstream CLI metadata:");
    protocol.warn(err);
    return {};
  }
};

export const getRuntimeVersions = async (protocol: Protocol): Promise<{
  versions: RuntimeVersion[];
}> => {
  const hostedDenoRuntimeVersion = await getHostedDenoRuntimeVersion(protocol);
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
  const prunedDoctor = await getRuntimeVersions(protocol);
  protocol.respond(JSON.stringify(prunedDoctor));
}
