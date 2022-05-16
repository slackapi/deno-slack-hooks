import { assertEquals, assertRejects } from "../dev_deps.ts";
import { getStartHookAdditionalFlags } from "../flags.ts";

Deno.test("getStartHookAdditionalFlags sets certificate validation flag, with =", () => {
  const result = getStartHookAdditionalFlags([
    "--sdk-unsafely-ignore-certificate-errors=https://dev1234.slack.com",
  ]);
  assertEquals(
    result,
    "--unsafely-ignore-certificate-errors=https://dev1234.slack.com",
  );
});

Deno.test("getStartHookAdditionalFlags sets certificate validation flag", () => {
  const result = getStartHookAdditionalFlags([
    "--sdk-unsafely-ignore-certificate-errors",
    "https://dev1234.slack.com",
  ]);
  assertEquals(
    result,
    "--unsafely-ignore-certificate-errors=https://dev1234.slack.com",
  );
});

Deno.test("getStartHookAdditionalFlags passes through empty flags", () => {
  const result = getStartHookAdditionalFlags([]);
  assertEquals(
    result,
    "",
  );
});
