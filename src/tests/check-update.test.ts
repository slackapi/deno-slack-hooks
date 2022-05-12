import { assertEquals, assertRejects } from "../dev_deps.ts";
import * as mf from "../dev_deps.ts";
import { extractVersion, fetchLatestModuleVersion } from "../check-update.ts";

Deno.test("check-update hook tests", async (t) => {
  await t.step("extractVersion method", async (evT) => {
    await evT.step(
      "if version string does not contain an '@' then return empty",
      () => {
        assertEquals(
          extractVersion("bat country"),
          "",
          "empty string not returned",
        );
      },
    );

    await evT.step(
      "if version string contains a slash after the '@' should return just the version",
      () => {
        assertEquals(
          extractVersion("https://deon.land/x/slack_goodise@0.1.0/mod.ts"),
          "0.1.0",
          "version not returned",
        );
      },
    );

    await evT.step(
      "if version string does not contain a slash after the '@' should return just the version",
      () => {
        assertEquals(
          extractVersion("https://deon.land/x/slack_goodise@0.1.0"),
          "0.1.0",
          "version not returned",
        );
      },
    );
  });
  await t.step("fetchLatestModuleVersion method", async (evT) => {
    mf.install(); // mock out calls to fetch
    await evT.step(
      "should throw if location header is not returned",
      async () => {
        mf.mock("GET@/x/slack", async (req: Request) => {
          return new Response(null, { headers: {} });
        });
        await assertRejects(async () => {
          return await fetchLatestModuleVersion("slack");
        });
      },
    );
    await evT.step(
      "should return version extracted from location header",
      async () => {
        mf.mock("GET@/x/slack", async (req: Request) => {
          return new Response(null, {
            headers: { location: "/x/slack@0.1.1" },
          });
        });
        const version = await fetchLatestModuleVersion("slack");
        assertEquals(version, "0.1.1", "inocrrect version returned");
      },
    );
    mf.uninstall();
  });
});
