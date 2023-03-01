import type { Protocol } from "./types.ts";
import { spy } from "../dev_deps.ts";

export const MockProtocol = function (): Protocol {
  return {
    log: spy(),
    warn: spy(),
    error: spy(),
    respond: spy(),
  };
};
