import { assertEquals, assertRejects } from "../dev_deps.ts";
import { mockFetch, mockFile } from "../dev_deps.ts";
import {
  extractDependencies,
  extractVersion,
  fetchLatestModuleVersion,
  getDenoImportMapFiles,
  readProjectDependencies,
} from "../check_update.ts";

const MOCK_SLACK_JSON = JSON.stringify({
  hooks: {
    "get-hooks":
      "deno run -q --allow-read --allow-net https://deno.land/x/deno_slack_hooks@0.0.9/mod.ts",
  },
});

const MOCK_IMPORT_MAP_JSON = JSON.stringify({
  imports: {
    "deno-slack-sdk/": "https://deno.land/x/deno_slack_sdk@0.0.6/",
    "deno-slack-api/": "https://deno.land/x/deno_slack_api@0.0.6/",
  },
});

const MOCK_DENO_JSON = JSON.stringify({
  "importMap": "import_map.json",
});

const MOCK_SLACK_JSON_FILE = new TextEncoder().encode(MOCK_SLACK_JSON);
const MOCK_IMPORT_MAP_FILE = new TextEncoder().encode(MOCK_IMPORT_MAP_JSON);
const MOCK_DENO_JSON_FILE = new TextEncoder().encode(MOCK_DENO_JSON);

Deno.test("check-update hook tests", async (t) => {
  // readProjectDependencies
  await t.step("readProjectDependencies method", async (evT) => {
    await evT.step(
      "if dependency file contains recnognized dependency, version appears in returned map",
      async () => {
        mockFile.prepareVirtualFile("./slack.json", MOCK_SLACK_JSON_FILE);
        mockFile.prepareVirtualFile("./deno.json", MOCK_DENO_JSON_FILE);
        mockFile.prepareVirtualFile("./import_map.json", MOCK_IMPORT_MAP_FILE);

        const actual = await readProjectDependencies();

        // Expected dependencies are present in returned versionMap
        assertEquals(
          true,
          "deno_slack_hooks" in actual &&
            "deno_slack_api" in actual &&
            "deno_slack_hooks" in actual,
        );

        // Initial expected versionMap properties are present (name, current)
        assertEquals(
          true,
          Object.values(actual).every((dep) => dep.name && dep.current),
          "slack.json dependency wasn't found in returned versionMap",
        );
      },
    );
  });

  // getDenoImportMapFiles
  await t.step("getDenoImportMapFiles method", async (evT) => {
    await evT.step(
      "if deno.json file is unavailable, or no importMap key is present, an empty array is returned",
      async () => {
        // Clear out deno.json file that's in memory from previous test(s)
        mockFile.prepareVirtualFile(
          "./deno.json",
          new TextEncoder().encode(""),
        );

        const cwd = Deno.cwd();
        const actual = await getDenoImportMapFiles(cwd);
        const expected: [string, "imports" | "hooks"][] = [];

        assertEquals(
          actual,
          expected,
          `Expected: ${JSON.stringify(expected)}\n Actual: ${
            JSON.stringify(actual)
          }`,
        );
      },
    );

    await evT.step(
      "if deno.json file is available, the correct filename + dependency key pair is returned",
      async () => {
        const cwd = Deno.cwd();
        mockFile.prepareVirtualFile("./deno.json", MOCK_DENO_JSON_FILE);

        const actual = await getDenoImportMapFiles(cwd);

        // Correct custom importMap file name is returned
        assertEquals(
          actual,
          [["import_map.json", "imports"]],
        );
      },
    );
  });

  // extractDependencies
  await t.step("extractDependencies method", async (evT) => {
    await evT.step(
      "given import_map.json or slack.json file contents, an array of key, value dependency pairs is returned",
      async () => {
        const importMapActual = await extractDependencies(
          JSON.parse(MOCK_IMPORT_MAP_JSON),
          "imports",
        );

        const slackHooksActual = await extractDependencies(
          JSON.parse(MOCK_SLACK_JSON),
          "hooks",
        );

        const importMapExpected: [string, string][] = [[
          "deno-slack-sdk/",
          "https://deno.land/x/deno_slack_sdk@0.0.6/",
        ], ["deno-slack-api/", "https://deno.land/x/deno_slack_api@0.0.6/"]];

        const slackHooksExpected: [string, string][] = [
          [
            "get-hooks",
            "deno run -q --allow-read --allow-net https://deno.land/x/deno_slack_hooks@0.0.9/mod.ts",
          ],
        ];

        assertEquals(
          importMapActual,
          importMapExpected,
          `Expected: ${JSON.stringify([])}\n Actual: ${
            JSON.stringify(importMapActual)
          }`,
        );

        assertEquals(
          slackHooksActual,
          slackHooksExpected,
          `Expected: ${JSON.stringify([])}\n Actual: ${
            JSON.stringify(importMapActual)
          }`,
        );
      },
    );
  });

  // extractVersion
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

  // fetchLatestModuleVersion
  await t.step("fetchLatestModuleVersion method", async (evT) => {
    mockFetch.install(); // mock out calls to fetch
    await evT.step(
      "should throw if location header is not returned",
      async () => {
        mockFetch.mock("GET@/x/slack", (_req: Request) => {
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
        mockFetch.mock("GET@/x/slack", (_req: Request) => {
          return new Response(null, {
            headers: { location: "/x/slack@0.1.1" },
          });
        });
        const version = await fetchLatestModuleVersion("slack");
        assertEquals(version, "0.1.1", "inocrrect version returned");
      },
    );
    mockFetch.uninstall();
  });
});
