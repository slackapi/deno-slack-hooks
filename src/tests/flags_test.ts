import { assertEquals } from "../dev_deps.ts";
import { getOptionalDevDomainFlag, parseDevDomain } from "../flags.ts";

Deno.test("getOptionalDevDomainFlag sets sdk-slack-dev-domain, with legacy flag using =", () => {
  const result = getOptionalDevDomainFlag([
    "--sdk-unsafely-ignore-certificate-errors=https://dev1234.slack.com",
  ]);
  assertEquals(
    result,
    "--sdk-slack-dev-domain=https://dev1234.slack.com",
  );
});

Deno.test("getOptionalDevDomainFlag sets sdk-slack-dev-domain, with legacy flag", () => {
  const result = getOptionalDevDomainFlag([
    "--sdk-unsafely-ignore-certificate-errors",
    "https://dev1234.slack.com",
  ]);
  assertEquals(
    result,
    "--sdk-slack-dev-domain=https://dev1234.slack.com",
  );
});

Deno.test("getOptionalDevDomainFlag sets sdk-slack-dev-domain, with sdk-slack-dev-domain flag using =", () => {
  const result = getOptionalDevDomainFlag([
    "--sdk-slack-dev-domain=https://dev1234.slack.com",
  ]);
  assertEquals(
    result,
    "--sdk-slack-dev-domain=https://dev1234.slack.com",
  );
});

Deno.test("getOptionalDevDomainFlag sets sdk-slack-dev-domain, with sdk-slack-dev-domain flag", () => {
  const result = getOptionalDevDomainFlag([
    "--sdk-slack-dev-domain",
    "https://dev1234.slack.com",
  ]);
  assertEquals(
    result,
    "--sdk-slack-dev-domain=https://dev1234.slack.com",
  );
});

Deno.test("getOptionalDevDomainFlag passes through empty flags", () => {
  const result = getOptionalDevDomainFlag([]);
  assertEquals(result, "");
});

Deno.test("getOptionalDevDomainFlag passes ignores unsupported flags", () => {
  const result = getOptionalDevDomainFlag(["--nonsense=foo"]);
  assertEquals(result, "");
});

Deno.test("parseDevDomain function", async (t) => {
  await t.step("parses the right flag", () => {
    const domain = parseDevDomain(["--sdk-slack-dev-domain=foo.com"]);
    assertEquals(domain, "foo.com");
  });

  Deno.test("parseDevDomain defaults to empty string", () => {
    const domain = parseDevDomain([]);
    assertEquals(domain, "");
  });
});
