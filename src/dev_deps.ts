export {
  assertEquals,
  assertExists,
  assertRejects,
  assertStringIncludes,
} from "https://deno.land/std@0.138.0/testing/asserts.ts";
export {
  assertSpyCall,
  assertSpyCalls,
  spy,
} from "https://deno.land/std@0.177.0/testing/mock.ts";
export type { Spy } from "https://deno.land/std@0.177.0/testing/mock.ts";
export * as mockFetch from "https://deno.land/x/mock_fetch@0.3.0/mod.ts";
export * as mockFile from "https://deno.land/x/mock_file@v1.0.1/mod.ts";
// TODO: update the URLs here once the protocols repo passes review and has a release
export { MockProtocol } from "https://raw.githubusercontent.com/slackapi/deno-slack-protocols/initial/src/mock.ts";
