import { parseCLIArguments } from "./deps.ts";

const UNSAFELY_IGNORE_CERT_ERRORS_FLAG =
  "sdk-unsafely-ignore-certificate-errors";
const SLACK_DEV_DOMAIN_FLAG = "sdk-slack-dev-domain";

/**
 * Prepare the defined dev domain flag from parsed CLI arguments in a backwards
 * compatible manner
 * @param args An array of command line flags
 * @returns A flag to be used in other hooks for existing dev domains
 */
export const getOptionalDevDomainFlag = (args: string[]): string => {
  const parsedArgs = parseCLIArguments(args);
  const extraFlagValue = parsedArgs[SLACK_DEV_DOMAIN_FLAG] ??
    parsedArgs[UNSAFELY_IGNORE_CERT_ERRORS_FLAG] ?? "";

  let extraFlag = "";
  if (extraFlagValue) {
    extraFlag = `--sdk-slack-dev-domain=${extraFlagValue}`;
  }
  return extraFlag;
};

/**
 * Retreive the custom API host for the dev domain from command line flags
 * @param args An array of command line flags
 * @returns The value of the SLACK_DEV_DOMAIN_FLAG flag, or empty string
 */
export const parseDevDomain = (args: string[]): string => {
  const flags = parseCLIArguments(args);
  return flags[SLACK_DEV_DOMAIN_FLAG] ?? "";
};
