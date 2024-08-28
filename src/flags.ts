import { parse as parseCLIArguments } from "https://deno.land/std@0.138.0/flags/mod.ts"; // This prevents all dependencies from deps.ts to be installed when they are not needed

const UNSAFELY_IGNORE_CERT_ERRORS_FLAG =
  "sdk-unsafely-ignore-certificate-errors";
const SLACK_DEV_DOMAIN_FLAG = "sdk-slack-dev-domain";

export const getStartHookAdditionalDenoFlags = (args: string[]): string => {
  const parsedArgs = parseCLIArguments(args);
  const extraFlagValue = parsedArgs[SLACK_DEV_DOMAIN_FLAG] ??
    parsedArgs[UNSAFELY_IGNORE_CERT_ERRORS_FLAG] ?? "";

  let extraFlag = "";
  if (extraFlagValue) {
    extraFlag = `--sdk-slack-dev-domain=${extraFlagValue}`;
  }
  return extraFlag;
};
