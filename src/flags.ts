import { parse } from "./deps.ts";

const UNSAFELY_IGNORE_CERT_ERRORS_FLAG =
  "sdk-unsafely-ignore-certificate-errors";

export const getStartHookAdditionalDenoFlags = (args: string[]): string => {
  const parsedArgs = parse(args);
  let certErrorsFlag = "";
  if (parsedArgs[UNSAFELY_IGNORE_CERT_ERRORS_FLAG]) {
    certErrorsFlag = `--unsafely-ignore-certificate-errors=${
      parsedArgs[UNSAFELY_IGNORE_CERT_ERRORS_FLAG]
    }`;
  }
  return certErrorsFlag;
};
