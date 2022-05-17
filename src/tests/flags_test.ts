import { assertEquals } from "../dev_deps.ts";
import { getStartHookAdditionalDenoFlags } from "../flags.ts";

Deno.test("getStartHookAdditionalFlags sets certificate validation flag, with =", () => {
  const result = getStartHookAdditionalDenoFlags([
    "--sdk-unsafely-ignore-certificate-errors=https://dev1234.slack.com",
  ]);
  assertEquals(
    result,
    "--unsafely-ignore-certificate-errors=https://dev1234.slack.com",
  );
});

Deno.test("getStartHookAdditionalFlags sets certificate validation flag", () => {
  const result = getStartHookAdditionalDenoFlags([
    "--sdk-unsafely-ignore-certificate-errors",
    "https://dev1234.slack.com",
  ]);
  assertEquals(
    result,
    "--unsafely-ignore-certificate-errors=https://dev1234.slack.com",
  );
});

Deno.test("getStartHookAdditionalFlags passes through empty flags", () => {
  const result = getStartHookAdditionalDenoFlags([]);
  assertEquals(
    result,
    "",
  );
});
