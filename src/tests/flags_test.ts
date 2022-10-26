import { assertEquals } from "../dev_deps.ts";
import { getStartHookAdditionalDenoFlags } from "../flags.ts";

Deno.test("getStartHookAdditionalFlags sets sdk-slack-dev-domain, with legacy flag using =", () => {
  const result = getStartHookAdditionalDenoFlags([
    "--sdk-unsafely-ignore-certificate-errors=https://dev1234.slack.com",
  ]);
  assertEquals(
    result,
    "--sdk-slack-dev-domain=https://dev1234.slack.com",
  );
});

Deno.test("getStartHookAdditionalFlags sets sdk-slack-dev-domain, with legacy flag", () => {
  const result = getStartHookAdditionalDenoFlags([
    "--sdk-unsafely-ignore-certificate-errors",
    "https://dev1234.slack.com",
  ]);
  assertEquals(
    result,
    "--sdk-slack-dev-domain=https://dev1234.slack.com",
  );
});

Deno.test("getStartHookAdditionalFlags sets sdk-slack-dev-domain, with sdk-slack-dev-domain flag using =", () => {
  const result = getStartHookAdditionalDenoFlags([
    "--sdk-slack-dev-domain=https://dev1234.slack.com",
  ]);
  assertEquals(
    result,
    "--sdk-slack-dev-domain=https://dev1234.slack.com",
  );
});

Deno.test("getStartHookAdditionalFlags sets sdk-slack-dev-domain, with sdk-slack-dev-domain flag", () => {
  const result = getStartHookAdditionalDenoFlags([
    "--sdk-slack-dev-domain",
    "https://dev1234.slack.com",
  ]);
  assertEquals(
    result,
    "--sdk-slack-dev-domain=https://dev1234.slack.com",
  );
});

Deno.test("getStartHookAdditionalFlags passes through empty flags", () => {
  const result = getStartHookAdditionalDenoFlags([]);
  assertEquals(result, "");
});

Deno.test("getStartHookAdditionalFlags passes ignores unsupported flags", () => {
  const result = getStartHookAdditionalDenoFlags(["--nonsense=foo"]);
  assertEquals(result, "");
});
