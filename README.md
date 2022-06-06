# deno-slack-hooks

This library is intended to be used in applications running on Slack's next-generation application platform, focused on remixable
units of functionality encapsulated as ephemeral functions. It implements the communication contract between the
[Slack CLI][cli] and any Slack app development SDKs.

## Requirements

This library requires a recent (at least 1.22) version of [deno](https://deno.land).

Any invocations of this library require the `--allow-read` and `--allow-net` [deno permissions](https://deno.land/manual/getting_started/permissions).

## Script Overrides

If you find yourself needing to override a hook script specified by this library, you can do so in your Slack app's `/slack.json` file! Just specify a new script for the hook in question. The hooks currently provided by this repo that can be overridden are `build`, `start`, and `get-manifest`.

Below is an example `/slack.json` file that overrides the `build` script to point to your local repo for development purposes. It's using an implicit "latest" version of the https://deno.land/x/deno_slack_hooks/mod.ts script, but we suggest pinning it to whatever the latest version is.

```json
{
  "hooks": {
    "get-hooks": "deno run -q --allow-read --allow-net https://deno.land/x/deno_slack_hooks/mod.ts",
    "build": "deno run -q --config=deno.jsonc --allow-read --allow-write --allow-net --allow-run file:///<path-to-your-local-repo>/mod.ts"
  }
}
```

The [Slack CLI][cli] will automatically know to pick up your local hook definition and use that instead of what's defined by this library.

This can also be used to change the flags sent to the `deno run` command if you decide to change the location of your config file, or switch to an import map instead.

## Running Tests

If you make changes to this repo, or just want to make sure things are working as desired, you can run:

    deno task test

To get a full test coverage report, run:

    deno task coverage

---

### Getting Help

We welcome contributions from everyone! Please check out our
[Contributor's Guide](.github/CONTRIBUTING.md) for how to contribute in a
helpful and collaborative way.

[cli]: https://github.com/slackapi/slack-cli
