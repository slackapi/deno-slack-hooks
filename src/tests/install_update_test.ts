import { assertEquals } from "../dev_deps.ts";
import { mockFile } from "../dev_deps.ts";
import {
  createUpdateResp,
  SDK_NAME,
  updateDependencyFile,
  updateDependencyMap,
} from "../install_update.ts";

const MOCK_RELEASES = [
  {
    name: "deno_slack_sdk",
    current: "0.0.6",
    latest: "0.0.7",
    update: true,
    breaking: false,
    error: null,
  },
  {
    name: "deno_slack_api",
    current: "0.0.6",
    latest: "0.0.7",
    update: true,
    breaking: false,
    error: null,
  },
  {
    name: "deno_slack_hooks",
    current: "0.0.9",
    latest: "0.0.10",
    update: true,
    breaking: false,
    error: null,
  },
];

const MOCK_HOOKS_JSON = JSON.stringify({
  hooks: {
    "get-hooks":
      "deno run -q --allow-read --allow-net https://deno.land/x/deno_slack_hooks@0.0.9/mod.ts",
  },
});

const MOCK_IMPORTS_JSON = JSON.stringify({
  imports: {
    "deno-slack-sdk/": "https://deno.land/x/deno_slack_sdk@0.0.6/",
    "deno-slack-api/": "https://deno.land/x/deno_slack_api@0.0.6/",
  },
});

const MOCK_DENO_JSON = JSON.stringify({
  "importMap": "import_map.json",
});

// Returns any because Type 'Uint8Array' is a not generic in Deno 1
// deno-lint-ignore no-explicit-any
const encodeStringToUint8Array = (data: string): any => {
  return new TextEncoder().encode(
    data,
  );
};
const MOCK_SLACK_JSON_FILE = encodeStringToUint8Array(MOCK_HOOKS_JSON);
const MOCK_DOT_SLACK_HOOKS_JSON_FILE = encodeStringToUint8Array(
  MOCK_HOOKS_JSON,
);
const MOCK_IMPORT_MAP_FILE = encodeStringToUint8Array(MOCK_IMPORTS_JSON);
const MOCK_DENO_JSON_FILE = encodeStringToUint8Array(MOCK_DENO_JSON);
const MOCK_IMPORTS_IN_DENO_JSON_FILE = encodeStringToUint8Array(
  MOCK_IMPORTS_JSON,
);
const EMPTY_JSON_FILE = encodeStringToUint8Array("{}");

const setEmptyJsonFiles = () => {
  mockFile.prepareVirtualFile("./slack.json", EMPTY_JSON_FILE);
  mockFile.prepareVirtualFile("./slack.jsonc", EMPTY_JSON_FILE);
  mockFile.prepareVirtualFile("./deno.json", EMPTY_JSON_FILE);
  mockFile.prepareVirtualFile("./deno.jsonc", EMPTY_JSON_FILE);
  mockFile.prepareVirtualFile("./import_map.json", EMPTY_JSON_FILE);
  mockFile.prepareVirtualFile("./.slack/hooks.json", EMPTY_JSON_FILE);
};

Deno.test("update hook tests", async (t) => {
  await t.step("createUpdateResp", async (evT) => {
    await evT.step(
      "if dependency files are not found, response does not include an error",
      async () => {
        // Absence of prepareVirtualFile ensures that file does not exist
        // NOTE: *must* go before .prepareVirtualFile-dependent tests below until
        // it's clear how to "unmount" a file. Once it's there.. it's there.
        const actual = await createUpdateResp(MOCK_RELEASES);
        const expected = { name: SDK_NAME, updates: [] };

        assertEquals(actual, expected);
      },
    );

    await evT.step(
      "if referenced importMap in deno.json has available updates, then response includes those updates",
      async () => {
        setEmptyJsonFiles();
        mockFile.prepareVirtualFile(
          "./slack.json",
          MOCK_SLACK_JSON_FILE,
        );
        mockFile.prepareVirtualFile("./deno.json", MOCK_DENO_JSON_FILE);
        mockFile.prepareVirtualFile("./import_map.json", MOCK_IMPORT_MAP_FILE);

        const expectedHooksUpdateSummary = [{
          name: "deno_slack_hooks",
          previous: "0.0.9",
          installed: "0.0.10",
        }];

        const expectedImportsUpdateSummary = [
          {
            name: "deno_slack_sdk",
            previous: "0.0.6",
            installed: "0.0.7",
          },
          {
            name: "deno_slack_api",
            previous: "0.0.6",
            installed: "0.0.7",
          },
        ];

        const actual = await createUpdateResp(MOCK_RELEASES);
        const expected = {
          name: SDK_NAME,
          updates: [
            ...expectedHooksUpdateSummary,
            ...expectedImportsUpdateSummary,
          ],
        };

        assertEquals(actual, expected);
      },
    );

    await evT.step(
      "if referenced imports in deno.json has available updates, then response includes those updates",
      async () => {
        setEmptyJsonFiles();
        mockFile.prepareVirtualFile(
          "./.slack/hooks.json",
          MOCK_DOT_SLACK_HOOKS_JSON_FILE,
        );
        mockFile.prepareVirtualFile(
          "./deno.jsonc",
          MOCK_IMPORTS_IN_DENO_JSON_FILE,
        );

        const expectedHooksUpdateSummary = [{
          name: "deno_slack_hooks",
          previous: "0.0.9",
          installed: "0.0.10",
        }];

        const expectedImportsUpdateSummary = [
          {
            name: "deno_slack_sdk",
            previous: "0.0.6",
            installed: "0.0.7",
          },
          {
            name: "deno_slack_api",
            previous: "0.0.6",
            installed: "0.0.7",
          },
        ];

        const actual = await createUpdateResp(MOCK_RELEASES);
        const expected = {
          name: SDK_NAME,
          updates: [
            ...expectedImportsUpdateSummary,
            ...expectedHooksUpdateSummary,
          ],
        };

        assertEquals(actual, expected);
      },
    );
  });

  await t.step("updateDependencyFile", async (evT) => {
    await evT.step(
      "if dependency updates are available, the correct update summary is returned",
      async () => {
        setEmptyJsonFiles();
        const expectedHooksUpdateResp = [
          {
            name: "deno_slack_hooks",
            previous: "0.0.9",
            installed: "0.0.10",
          },
        ];

        const expectedImportsUpdateResp = [
          {
            name: "deno_slack_sdk",
            previous: "0.0.6",
            installed: "0.0.7",
          },
          {
            name: "deno_slack_api",
            previous: "0.0.6",
            installed: "0.0.7",
          },
        ];

        mockFile.prepareVirtualFile(
          "./slack.json",
          MOCK_SLACK_JSON_FILE,
        );

        mockFile.prepareVirtualFile(
          "./import_map.json",
          MOCK_IMPORT_MAP_FILE,
        );

        assertEquals(
          await updateDependencyFile("./slack.json", MOCK_RELEASES),
          expectedHooksUpdateResp,
        );

        assertEquals(
          await updateDependencyFile("./import_map.json", MOCK_RELEASES),
          expectedImportsUpdateResp,
        );
      },
    );

    await evT.step(
      "if file isn't found, an empty update array is returned",
      async () => {
        setEmptyJsonFiles();
        assertEquals(
          await updateDependencyFile("./bad_file.json", MOCK_RELEASES),
          [],
          "correct dependency update response for slack.json was not returned",
        );
      },
    );
  });

  await t.step("updateDependencyMap", async (evT) => {
    await evT.step(
      "update versions are correctly mapped to the file's dependency map",
      () => {
        setEmptyJsonFiles();
        const { hooks } = JSON.parse(MOCK_HOOKS_JSON);
        const { imports } = JSON.parse(MOCK_IMPORTS_JSON);

        const expectedHooksJSON = {
          hooks: {
            "get-hooks":
              // Bump the version from 0.0.9 => 0.0.10
              "deno run -q --allow-read --allow-net https://deno.land/x/deno_slack_hooks@0.0.10/mod.ts",
          },
        };

        const expectedHooksUpdateSummary = [{
          name: "deno_slack_hooks",
          previous: "0.0.9",
          installed: "0.0.10",
        }];

        const expectedImportMapJSON = {
          imports: {
            // Bump the versions from 0.0.6 => 0.0.7
            "deno-slack-sdk/": "https://deno.land/x/deno_slack_sdk@0.0.7/",
            "deno-slack-api/": "https://deno.land/x/deno_slack_api@0.0.7/",
          },
        };

        const expectedImportsUpdateSummary = [
          {
            name: "deno_slack_sdk",
            previous: "0.0.6",
            installed: "0.0.7",
          },
          {
            name: "deno_slack_api",
            previous: "0.0.6",
            installed: "0.0.7",
          },
        ];

        assertEquals(
          updateDependencyMap(hooks, MOCK_RELEASES),
          {
            updatedDependencies: expectedHooksJSON.hooks,
            updateSummary: expectedHooksUpdateSummary,
          },
          "expected update of slack.json map not returned",
        );

        assertEquals(
          updateDependencyMap(imports, MOCK_RELEASES),
          {
            updatedDependencies: expectedImportMapJSON.imports,
            updateSummary: expectedImportsUpdateSummary,
          },
          "expected update of import_map.json map not returned",
        );
      },
    );
  });
});
