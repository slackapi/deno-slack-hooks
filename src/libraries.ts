import hooksVersion from "./version.ts";

export const DENO_SLACK_SDK = "deno_slack_sdk";
export const DENO_SLACK_BUILDER = "deno_slack_builder";
export const DENO_SLACK_API = "deno_slack_api";
export const DENO_SLACK_HOOKS = "deno_slack_hooks";
export const DENO_SLACK_RUNTIME = "deno_slack_runtime";

export const VERSIONS = {
  [DENO_SLACK_BUILDER]: "0.0.14",
  [DENO_SLACK_RUNTIME]: "0.0.9",
  [DENO_SLACK_HOOKS]: hooksVersion,
};

export const BUILDER_TAG = `${DENO_SLACK_BUILDER}@${
  VERSIONS[DENO_SLACK_BUILDER]
}`;
export const RUNTIME_TAG = `${DENO_SLACK_RUNTIME}@${
  VERSIONS[DENO_SLACK_RUNTIME]
}`;
export const HOOKS_TAG = `${DENO_SLACK_HOOKS}@${VERSIONS[DENO_SLACK_HOOKS]}`;
