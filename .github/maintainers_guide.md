# Maintainers Guide

This document describes tools, tasks and workflow that one needs to be familiar with in order to effectively maintain
this project. If you use this package within your own software as is but don't plan on modifying it, this guide is
**not** for you.

## Tools

You will need [Deno](https://deno.land).

## Tasks

### Testing

This package has unit tests in the `src/tests` directory. You can run the entire test suite via:

    deno test --allow-read --allow-env --coverage=.coverage

To run the tests along with a coverage report:

    deno test --allow-read --allow-env --coverage=.coverage && deno coverage --exclude="fixtures|test" .coverage

This command is also executed by GitHub Actions, the continuous integration service, for every Pull Request and branch.

### Linting and Formatting

This package adheres to deno lint and formatting standards. To ensure the code base adheres to these standards, run the following commands:

    deno lint ./src
    deno fmt ./src

Any warnings and errors must be addressed.

### Releasing

Releasing can feel intimidating at first, but rest assured: if you make a mistake, don't fret! We can always roll forward with another release 😃

1. Make sure your local `main` branch has the latest changes.
2. Run the tests as per the above Testing section, and any other local verification, such as:
  - Local integration tests between the Slack CLI, deno-sdk-based application template(s) and this repo. One can modify a deno-sdk-based app project's `slack.json` file to point the `get-hooks` hook to a local version of this repo rather than the deno.land-hosted version.
3. Bump the version number for this repo in adherence to [Semantic Versioning](http://semver.org/) in `src/libraries.ts`, specifically the `VERSIONS` map's `DENO_SLACK_HOOKS` key.
  - Make a single commit with a message for the version bump.
4. Tag the version commit with a tag matching the version number. I.e. if you are releasing version 1.2.3 of this repo, then the git tag should be `1.2.3`.
  - This can be done with the command: `git tag 1.2.3`
5. Push the commit and tag to GitHub: `git push --tags origin main`. This will kick off an automatic deployment to https://deno.land/x/deno_slack_hooks
6. Create a GitHub Release based on the newly-created tag with release notes.
  - From the repository, navigate to the **Releases** section and draft a new release. You can use prior releases as a template.
