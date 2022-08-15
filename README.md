# deno-slack-hooks

This library is intended to be used in applications running on Slack's next-generation application platform, focused on remixable
units of functionality encapsulated as ephemeral functions. It implements the communication contract between the
[Slack CLI][cli] and any Slack app development SDKs.

## Requirements

This library requires a recent (at least 1.22) version of [deno](https://deno.land).

Any invocations of this library require the `--allow-read` and `--allow-net` [deno permissions](https://deno.land/manual/getting_started/permissions).

## Supported Scripts
The hooks currently provided by this repo are `build`, `start`, `check-update`, `install-update`, `get-trigger`, and `get-manifest`.

| Hook Name         | CLI Command            | Description                     |
| ----------------- | ---------------------- | ------------------------------- |
| `build`           | `slack deploy`         | Bundles any functions with Deno into an output directory that's compatible with the Run on Slack runtime. For more information, see the [deno-slack-builder](https://github.com/slackapi/deno-slack-builder) repository. |
| `check-update`    | `slack upgrade`        | Checks the App's SDK dependencies to determine whether or not any of your libraries need to be updated. |
| `get-manifest`    | `slack manifest`       | Converts a `manifest.json`, `manifest.js`, or `manifest.ts` file int o a valid manifest JSON payload. For more information, see the [deno-slack-builder](https://github.com/slackapi/deno-slack-builder) repository's `--manifest` arg. |
| `get-hooks`       | N/A                    | Fetches the list of available hooks for the CLI from this repository. |
| `get-trigger`     | `slack trigger create` | Converts a specified `json`, `js`, or `ts` file into a valid trigger JSON payload to be uploaded by the CLI to the `workflows.triggers.create` Slack API endpoint. |
| `install-update`  | `slack upgrade`        | Prompts the user to automatically update any dependencies that need to be updated based on the result of the `check-update` hook. |
| `start`           | `slack run`            | Creates a socket connection between the Slack CLI and a Slack workspace for local development that includes hot reloading. For more information, see the [deno-slack-runtime](https://github.com/slackapi/deno-slack-runtime) repository's details on `local-run`. |


### Check Update Script Usage
The `check_update.ts` file is executed as a Deno program and takes no arguments.

#### Example
```bash
deno run -q --config=deno.jsonc --allow-read --allow-net https://deno.land/x/deno_slack_hooks/check_update.ts
```
### Get Hooks Script Usage
The `mod.ts` file is executed as a Deno program and takes no arguments.

#### Example
```bash
deno run -q --config=deno.jsonc --allow-read --allow-net https://deno.land/x/deno_slack_hooks/mod.ts
```
### Get Trigger Script Usage

The `get_trigger.ts` file is executed as a Deno program and takes one required argument:

| Arguments  | Description                                           |
| ---------- | ----------------------------------------------------- |
| `--source` | Absolute or relative path to your target trigger file. The trigger object must be exported as default from this file. |


#### Example
```bash
deno run -q --config=deno.jsonc --allow-read --allow-net https://deno.land/x/deno_slack_hooks/get_trigger.ts --source="./trigger.ts"
```

### Install Update Script Usage
The `check_update.ts` file is executed as a Deno program and takes no arguments.

#### Example
```bash
deno run -q --config=deno.jsonc --allow-run --allow-read --allow-write --allow-net https://deno.land/x/deno_slack_hooks/install_update.ts
```
## Script Overrides Usage

If you find yourself needing to override a hook script specified by this library, you can do so in your Slack app's `/slack.json` file! Just specify a new script for the hook in question. All supported hooks can be overwritten.

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
