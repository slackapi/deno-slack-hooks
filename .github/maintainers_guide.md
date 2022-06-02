# Maintainers Guide

This document describes tools, tasks and workflow that one needs to be familiar with in order to effectively maintain
this project. If you use this package within your own software as is but don't plan on modifying it, this guide is
**not** for you.

## Tools

You will need [Deno](https://deno.land).

## Tasks

### Testing

This package has unit tests in the `src/tests` directory. You can run the entire test suite (along with linting and formatting) via:

    deno task test

To run the tests along with a coverage report:

    deno task coverage

This command is also executed by GitHub Actions, the continuous integration service, for every Pull Request and branch.

### Releasing

Releasing can feel intimidating at first, but rest assured: if you make a mistake, don't fret! We can always roll forward with another release 😃

1. Make sure your local `main` branch has the latest changes.
2. Run the tests as per the above Testing section, and any other local verification, such as:
  - Local integration tests between the Slack CLI, deno-sdk-based application template(s) and this repo. One can modify a deno-sdk-based app project's `slack.json` file to point the `get-hooks` hook to a local version of this repo rather than the deno.land-hosted version.
3. Bump the version number for this repo in adherence to [Semantic Versioning][semver] in `src/libraries.ts`, specifically the `VERSIONS` map's `DENO_SLACK_HOOKS` key.
  - Make a single commit with a message for the version bump.
4. Create a new GitHub Release from the [Releases page](https://github.com/slackapi/deno-slack-hooks/releases) by clicking the "Draft a new release" button.
5. Input a new version manually into the "Choose a tag" input. Ensure that this version adheres to [semantic versioning][semver] based on what's being released. Version tags should match the following pattern: `1.0.1` (no `v` preceding the number).
  - After you input the new version, click the "Create a new tag: x.x.x on publish" button.
6. Set the "Target" input to the "main" branch.
7. Name the release title after the version tag.
8. Auto-generate the release notes by clicking the "Auto-generate release notes" button. Review the generated release notes, make sure they are accessible and approachable and that an end-user with little context about this project could still understand.
9. Make sure "This is a pre-release" is _not_ checked.
10. Publish the release by clicking the "Publish release" button!
11. After a few minutes, the corresponding version will be available on https://deno.land/x/deno_slack_hooks.

## Workflow

### Versioning and Tags

This project is versioned using [Semantic Versioning][semver].

### Branches

> Describe any specific branching workflow. For example:
> `main` is where active development occurs.
> Long running branches named feature branches are occasionally created for collaboration on a feature that has a large scope (because everyone cannot push commits to another person's open Pull Request)

### Issue Management

Labels are used to run issues through an organized workflow. Here are the basic definitions:

*  `bug`: A confirmed bug report. A bug is considered confirmed when reproduction steps have been
   documented and the issue has been reproduced.
*  `enhancement`: A feature request for something this package might not already do.
*  `docs`: An issue that is purely about documentation work.
*  `tests`: An issue that is purely about testing work.
*  `needs feedback`: An issue that may have claimed to be a bug but was not reproducible, or was otherwise missing some information.
*  `discussion`: An issue that is purely meant to hold a discussion. Typically the maintainers are looking for feedback in this issues.
*  `question`: An issue that is like a support request because the user's usage was not correct.
*  `semver:major|minor|patch`: Metadata about how resolving this issue would affect the version number.
*  `security`: An issue that has special consideration for security reasons.
*  `good first contribution`: An issue that has a well-defined relatively-small scope, with clear expectations. It helps when the testing approach is also known.
*  `duplicate`: An issue that is functionally the same as another issue. Apply this only if you've linked the other issue by number.


**Triage** is the process of taking new issues that aren't yet "seen" and marking them with a basic
level of information with labels. An issue should have **one** of the following labels applied:
`bug`, `enhancement`, `question`, `needs feedback`, `docs`, `tests`, or `discussion`.

Issues are closed when a resolution has been reached. If for any reason a closed issue seems
relevant once again, reopening is great and better than creating a duplicate issue.

## Everything else

When in doubt, find the other maintainers and ask.

[semver]: http://semver.org/
