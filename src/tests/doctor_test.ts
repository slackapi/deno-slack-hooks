import {
  assertEquals,
  assertSpyCall,
  assertSpyCalls,
  mockFetch,
  MockProtocol,
  Spy,
} from "../dev_deps.ts";
import { getRuntimeVersions } from "../doctor.ts";

const REAL_DENO_VERSION = Deno.version;
const MOCK_DENO_VERSION = {
  deno: "1.2.3",
  typescript: "5.0.0",
  v8: "12.3.456.78",
};

const MOCK_SLACK_CLI_MANIFEST = {
  "slack-cli": {
    "title": "Slack CLI",
    "description": "CLI for creating, building, and deploying Slack apps.",
    "releases": [
      {
        "version": "2.19.0",
        "release_date": "2024-03-11",
      },
    ],
  },
  "deno-runtime": {
    "title": "Deno Runtime",
    "releases": [
      {
        "version": "1.101.1",
        "release_date": "2023-09-19",
      },
    ],
  },
};

Deno.test("doctor hook tests", async (t) => {
  Object.defineProperty(Deno, "version", {
    value: MOCK_DENO_VERSION,
    writable: true,
    configurable: true,
  });
  mockFetch.install();

  await t.step("known runtime values for the system are returned", async () => {
    const protocol = MockProtocol();
    const mockResponse = new Response(null, { status: 404 });
    mockFetch.mock("GET@/slackcli/metadata.json", (_req: Request) => {
      return mockResponse;
    });
    Deno.version.deno = "1.2.3";

    const actual = await getRuntimeVersions(protocol);
    const expected = {
      versions: [
        {
          name: "deno",
          current: "1.2.3",
        },
        {
          name: "typescript",
          current: "5.0.0",
        },
        {
          name: "v8",
          current: "12.3.456.78",
        },
      ],
    };
    assertEquals(actual, expected);
    assertSpyCalls(protocol.warn as Spy, 2);
    assertSpyCall(protocol.warn as Spy, 0, {
      args: ["Failed to collect upstream CLI metadata:"],
    });
    assertSpyCall(protocol.warn as Spy, 1, {
      args: [mockResponse],
    });
  });

  await t.step("matched upstream requirements return success", async () => {
    const protocol = MockProtocol();
    mockFetch.mock("GET@/slackcli/metadata.json", (_req: Request) => {
      return new Response(JSON.stringify(MOCK_SLACK_CLI_MANIFEST));
    });
    Deno.version.deno = "1.101.1";

    const actual = await getRuntimeVersions(protocol);
    const expected = {
      versions: [
        {
          name: "deno",
          current: "1.101.1",
          message: undefined,
        },
        {
          name: "typescript",
          current: "5.0.0",
        },
        {
          name: "v8",
          current: "12.3.456.78",
        },
      ],
    };
    assertEquals(actual, expected);
  });

  await t.step("unsupported upstream runtimes note differences", async () => {
    const protocol = MockProtocol();
    mockFetch.mock("GET@/slackcli/metadata.json", (_req: Request) => {
      return new Response(JSON.stringify(MOCK_SLACK_CLI_MANIFEST));
    });
    Deno.version.deno = "1.2.3";

    const actual = await getRuntimeVersions(protocol);
    const expected = {
      versions: [
        {
          name: "deno",
          current: "1.2.3",
          message: "Applications deployed to Slack use Deno version 1.101.1",
          error: {
            message: "The installed runtime version is not supported",
          },
        },
        {
          name: "typescript",
          current: "5.0.0",
        },
        {
          name: "v8",
          current: "12.3.456.78",
        },
      ],
    };
    assertEquals(actual, expected);
    assertSpyCalls(protocol.warn as Spy, 0);
  });

  await t.step("missing minimums from cli metadata are noted", async () => {
    const protocol = MockProtocol();
    const metadata = {
      runtimes: ["deno", "node"],
    };
    mockFetch.mock("GET@/slackcli/metadata.json", (_req: Request) => {
      return new Response(JSON.stringify(metadata));
    });
    Deno.version.deno = "1.2.3";

    const actual = await getRuntimeVersions(protocol);
    const expected = {
      versions: [
        {
          name: "deno",
          current: "1.2.3",
        },
        {
          name: "typescript",
          current: "5.0.0",
        },
        {
          name: "v8",
          current: "12.3.456.78",
        },
      ],
    };
    assertEquals(actual, expected);
    assertSpyCalls(protocol.warn as Spy, 2);
    assertSpyCall(protocol.warn as Spy, 0, {
      args: [
        "Failed to find the minimum Deno version in the upstream CLI metadata response:",
      ],
    });
    assertSpyCall(protocol.warn as Spy, 1, {
      args: [JSON.stringify(metadata, null, "  ")],
    });
  });

  await t.step("invalid body in http responses are caught", async () => {
    const protocol = MockProtocol();
    mockFetch.mock("GET@/slackcli/metadata.json", (_req: Request) => {
      return new Response("{");
    });
    Deno.version.deno = "2.2.2";

    const actual = await getRuntimeVersions(protocol);
    const expected = {
      versions: [
        {
          name: "deno",
          current: "2.2.2",
        },
        {
          name: "typescript",
          current: "5.0.0",
        },
        {
          name: "v8",
          current: "12.3.456.78",
        },
      ],
    };
    assertEquals(actual, expected);
    assertSpyCalls(protocol.warn as Spy, 2);
    assertSpyCall(protocol.warn as Spy, 0, {
      args: [
        "Failed to collect or process upstream CLI metadata:",
      ],
    });
  });

  Object.defineProperty(Deno, "version", {
    value: REAL_DENO_VERSION,
    writable: false,
    configurable: false,
  });
  mockFetch.uninstall();
});
