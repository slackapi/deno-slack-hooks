export {
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "https://deno.land/std@0.138.0/testing/asserts.ts";
export {
  assertSpyCall,
  assertSpyCalls,
  spy,
} from "https://deno.land/std@0.177.0/testing/mock.ts";
export * as mockFetch from "https://deno.land/x/mock_fetch@0.3.0/mod.ts";

export * as mockFile from "https://deno.land/x/mock_file@v1.0.1/mod.ts";
export { MockProtocol } from "./protocol/mock.ts";
