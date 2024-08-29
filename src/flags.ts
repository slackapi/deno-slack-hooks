import { parseArgs } from "jsr:@std/cli@^1.0.4";

const UNSAFELY_IGNORE_CERT_ERRORS_FLAG =
  "sdk-unsafely-ignore-certificate-errors";
const SLACK_DEV_DOMAIN_FLAG = "sdk-slack-dev-domain";

export const getStartHookAdditionalDenoFlags = (args: string[]): string => {
  const parsedArgs = parseArgs(args);
  const extraFlagValue = parsedArgs[SLACK_DEV_DOMAIN_FLAG] ??
    parsedArgs[UNSAFELY_IGNORE_CERT_ERRORS_FLAG] ?? "";

  let extraFlag = "";
  if (extraFlagValue) {
    extraFlag = `--sdk-slack-dev-domain=${extraFlagValue}`;
  }
  return extraFlag;
};
