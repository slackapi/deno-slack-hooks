import { assertEquals, assertRejects } from "../dev_deps.ts";
import { mockFetch, mockFile } from "../dev_deps.ts";
import {
  createFileErrorMsg,
  createUpdateResp,
  extractDependencies,
  extractVersion,
  fetchLatestModuleVersion,
  getDenoImportMapFiles,
  hasBreakingChange,
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
  },
});

const MOCK_DENO_JSON = JSON.stringify({
  "importMap": "import_map.json",
  "imports": {
    "deno-slack-api/": "https://deno.land/x/deno_slack_api@0.0.6/",
  },
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

        const { versionMap } = await readProjectDependencies();

        // Expected dependencies are present in returned versionMap
        assertEquals(
          true,
          "deno_slack_hooks" in versionMap &&
            "deno_slack_api" in versionMap &&
            "deno_slack_hooks" in versionMap,
        );

        // Initial expected versionMap properties are present (name, current)
        assertEquals(
          true,
          Object.values(versionMap).every((dep) => dep.name && dep.current),
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
        const { denoJSONDepFiles } = await getDenoImportMapFiles(cwd);
        const expected: [string, "imports"][] = [];

        assertEquals(
          denoJSONDepFiles,
          expected,
          `Expected: ${JSON.stringify(expected)}\n Actual: ${
            JSON.stringify(denoJSONDepFiles)
          }`,
        );
      },
    );

    await evT.step(
      "if deno.json file is available, the correct filename + dependency key pair is returned",
      async () => {
        const cwd = Deno.cwd();
        mockFile.prepareVirtualFile("./deno.json", MOCK_DENO_JSON_FILE);

        const { denoJSONDepFiles } = await getDenoImportMapFiles(cwd);

        // Correct custom importMap file name is returned
        assertEquals(
          denoJSONDepFiles,
          [["import_map.json", "imports"]],
        );
      },
    );
  });

  // extractDependencies
  await t.step("extractDependencies method", async (evT) => {
    await evT.step(
      "given import_map.json or slack.json file contents, an array of key, value dependency pairs is returned",
      () => {
        const denoJSONActual = extractDependencies(
          JSON.parse(MOCK_DENO_JSON),
          "imports",
        );

        const importMapActual = extractDependencies(
          JSON.parse(MOCK_IMPORT_MAP_JSON),
          "imports",
        );

        const slackHooksActual = extractDependencies(
          JSON.parse(MOCK_SLACK_JSON),
          "hooks",
        );

        const denoJSONExpected: [string, string][] = [[
          "deno-slack-api/",
          "https://deno.land/x/deno_slack_api@0.0.6/",
        ]];

        const importMapExpected: [string, string][] = [[
          "deno-slack-sdk/",
          "https://deno.land/x/deno_slack_sdk@0.0.6/",
        ]];

        const slackHooksExpected: [string, string][] = [
          [
            "get-hooks",
            "deno run -q --allow-read --allow-net https://deno.land/x/deno_slack_hooks@0.0.9/mod.ts",
          ],
        ];

        assertEquals(
          denoJSONActual,
          denoJSONExpected,
          `Expected: ${JSON.stringify(denoJSONExpected)}\n Actual: ${
            JSON.stringify(denoJSONActual)
          }`,
        );

        assertEquals(
          importMapActual,
          importMapExpected,
          `Expected: ${JSON.stringify(importMapExpected)}\n Actual: ${
            JSON.stringify(importMapActual)
          }`,
        );

        assertEquals(
          slackHooksActual,
          slackHooksExpected,
          `Expected: ${JSON.stringify(slackHooksExpected)}\n Actual: ${
            JSON.stringify(slackHooksActual)
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

  // hasBreakingChange
  await t.step("hasBreakingChange method", async (evT) => {
    await evT.step(
      "should return true if version difference is 1.0.0 or greater",
      () => {
        const currentVersion = "1.0.0";
        const latestVersion = "2.0.0";
        assertEquals(hasBreakingChange(currentVersion, latestVersion), true);
      },
    );

    await evT.step(
      "should return false if version difference is 1.0.0 or less",
      () => {
        const currentVersion = "1.0.0";
        const latestVersion = "1.5.0";
        assertEquals(hasBreakingChange(currentVersion, latestVersion), false);
      },
    );
  });

  // fetchLatestModuleVersion
  await t.step("fetchLatestModuleVersion method", async (evT) => {
    mockFetch.install(); // mock out calls to fetch

    const mockMetadataJSON = JSON.stringify({
      "deno-slack-sdk": {
        title: "Deno Slack SDK",
        releases: [
          {
            version: "1.3.0",
            release_date: "2022-10-17",
          },
          {
            version: "1.2.7",
            release_date: "2022-10-10",
          },
        ],
      },
    });

    await evT.step(
      "should throw if module is not found",
      async () => {
        mockFetch.mock("GET@/slackcli/metadata.json", (_req: Request) => {
          return new Response(mockMetadataJSON);
        });
        await assertRejects(async () => {
          return await fetchLatestModuleVersion("non-existent-module");
        });
      },
    );
    await evT.step(
      "should return latest module version from metadata.json",
      async () => {
        mockFetch.mock("GET@/slackcli/metadata.json", (_req: Request) => {
          return new Response(mockMetadataJSON);
        });
        const version = await fetchLatestModuleVersion("deno-slack-sdk");
        assertEquals(version, "1.3.0", "incorrect version returned");
      },
    );
    mockFetch.uninstall();
  });

  // createUpdateResp
  await t.step("createUpdateResp method", async (evT) => {
    await evT.step(
      "response should include errors if there are inaccessible files found",
      () => {
        const error = new Error("test", {
          cause: new Deno.errors.PermissionDenied(),
        });
        const versionMap = {};
        const inaccessibleFiles = [{ name: "import_map.json", error }];
        const updateResp = createUpdateResp(versionMap, inaccessibleFiles);

        assertEquals(
          updateResp.error &&
            updateResp.error.message.includes("import_map.json"),
          true,
        );
      },
    );

    await evT.step(
      "response should not include errors if they are of type NotFound",
      () => {
        const error = new Error("test", {
          cause: new Deno.errors.NotFound(),
        });
        const versionMap = {};
        const inaccessibleFiles = [{ name: "import_map.json", error }];
        const updateResp = createUpdateResp(versionMap, inaccessibleFiles);

        assertEquals(!updateResp.error, true);
      },
    );
  });

  // createFileErrorMsg
  await t.step("createFileErrorMsg method", async (evT) => {
    await evT.step(
      "message should not include errors if they're instance of NotFound",
      () => {
        const error = new Error("test", {
          cause: new Deno.errors.NotFound(),
        });
        const inaccessibleFiles = [{ name: "import_map.json", error }];
        const errorMsg = createFileErrorMsg(inaccessibleFiles);
        assertEquals(errorMsg, "");
      },
    );

    await evT.step(
      "message should include errors if they're not instances of NotFound",
      () => {
        const notFoundError = new Error("test", {
          cause: new Deno.errors.NotFound(),
        });
        const permissionError = new Error("test", {
          cause: new Deno.errors.PermissionDenied(),
        });
        const inaccessibleFiles = [
          { name: "import_map.json", error: notFoundError },
          { name: "slack.json", error: permissionError },
        ];
        const errorMsg = createFileErrorMsg(inaccessibleFiles);
        assertEquals(true, !errorMsg.includes("import_map.json"));
        assertEquals(true, errorMsg.includes("slack.json"));
      },
    );
  });
});
