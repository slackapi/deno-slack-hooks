import { getProtocolInterface } from "jsr:@slack/protocols@0.0.3";
import type { JsonValue } from "jsr:@std/jsonc@^1.0.1";
import { join } from "jsr:@std/path@1.1.0";

import {
  checkForSDKUpdates,
  gatherDependencyFiles,
  Release,
} from "./check_update.ts";
import { getJSON } from "./utilities.ts";
import { projectScripts } from "./mod.ts";

export const SDK_NAME = "the Slack SDK";

interface InstallUpdateResponse {
  name: string;
  updates: Update[];
  error?: {
    message: string;
  } | null;
}

export interface Update {
  name: string;
  previous: string;
  installed: string;
  error?: {
    message: string;
  } | null;
}

/**
 * updateDependencies checks for SDK-related dependency updates. If
 * updatable releases are found, dependency files are updated with the
 * latest dependency versions and the project changes are cached.
 */
export const updateDependencies = async () => {
  const { releases } = await checkForSDKUpdates();
  const updatableReleases = releases.filter((r) =>
    r.update && r.current && r.latest
  );
  const updateResp = await createUpdateResp(updatableReleases);

  // If no errors occurred during installation, re-build
  // project as a means to cache the changes
  if (!updateResp.error) {
    try {
      // TODO: This try/catch should be nested within createUpdateResp
      // but doing so surfaces an issue with the --allow-run flag not
      // being used, despite its presence and success at this level
      runBuildHook();
    } catch (err: unknown) {
      updateResp.error = {
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return updateResp;
};

/**
 * createUpdateResp creates an object that contains each update,
 * featuring information about the current and latest version, as well
 * as if any errors occurred while attempting to update each.
 */
export async function createUpdateResp(
  releases: Release[],
): Promise<InstallUpdateResponse> {
  const updateResp: InstallUpdateResponse = { name: SDK_NAME, updates: [] };

  if (!releases.length) return updateResp;

  try {
    const cwd = Deno.cwd();
    const { dependencyFiles } = await gatherDependencyFiles(cwd);

    for (const [file, _] of dependencyFiles) {
      // Update dependency file with latest dependency versions
      try {
        const fileUpdateResp = await updateDependencyFile(
          join(cwd, file),
          releases,
        );
        updateResp.updates = [...updateResp.updates, ...fileUpdateResp];
      } catch (err) {
        const message = err instanceof Error
          ? err.message
          : `Caught non-Error value: ${String(err)} (type: ${typeof err})`;
        updateResp.error = updateResp.error
          ? { message: updateResp.error.message += `\n   ${message}` }
          : { message: message };
      }
    }
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : `Caught non-Error value: ${String(err)} (type: ${typeof err})`;
    updateResp.error = { message };
  }

  // Pare down updates by removing duplicates
  updateResp.updates = [...new Set(updateResp.updates)];

  return updateResp;
}

/**
 * updateDependencyFile reads the contents of a provided path, calls updateDependencyMap
 * to swap out the current versions with the latest releases available, and then writes
 * to the dependency file. Returns a summary of updates made.
 */
export async function updateDependencyFile(
  path: string,
  releases: Release[],
): Promise<Update[]> {
  try {
    const dependencyJSON = await getJSON(path);
    const isParsable = dependencyJSON && typeof dependencyJSON === "object" &&
      !Array.isArray(dependencyJSON) &&
      (dependencyJSON.imports || dependencyJSON.hooks);

    // If file doesn't exist, dependency key is missing or is of wrong type
    if (!isParsable) return [];

    const dependencyKey = dependencyJSON.imports ? "imports" : "hooks";

    if (dependencyJSON[dependencyKey] === undefined) {
      return [];
    }

    // Update only the dependency-related key in given file ("imports" or "hooks")
    const { updatedDependencies, updateSummary } = updateDependencyMap(
      dependencyJSON[dependencyKey],
      releases,
    );

    // Replace the dependency-related section with the updated version
    dependencyJSON[dependencyKey] = updatedDependencies;
    await Deno.writeTextFile(
      path,
      JSON.stringify(dependencyJSON, null, 2).concat("\n"),
    );

    return updateSummary;
  } catch (err) {
    const error = err instanceof Error
      ? err
      : Error(`Caught non-Error value: ${String(err)} (type: ${typeof err})`, {
        cause: err,
      });
    if (!(error.cause instanceof Deno.errors.NotFound)) throw err;
  }

  return [];
}

/**
 * updateDependencyMap takes in a map of the dependencies' key/value pairs and,
 * if an update exists for a dependency of the same name in the releases provided,
 * replaces the existing version with the latest version of the dependency. Returns
 * an updated map of all dependencies, as well as an update summary of each.
 */
export function updateDependencyMap(
  dependencyMap: JsonValue,
  releases: Release[],
) {
  const mapIsObject = dependencyMap && typeof dependencyMap === "object" &&
    !Array.isArray(dependencyMap);

  const updatedDependencies = mapIsObject ? { ...dependencyMap } : {};
  const updateSummary: Update[] = [];

  // Loop over key, val pairs of 'imports' or 'hooks', depending on file provided
  for (const [key, val] of Object.entries(updatedDependencies)) {
    for (const { name, current, latest } of releases) {
      // If the dependency matches an available release,
      // and an update is available, replace the version
      if (current && latest && typeof val === "string" && val.includes(name)) {
        updatedDependencies[key] = val.replace(current, latest);
        updateSummary.push({
          name,
          previous: current,
          installed: latest,
        });
      }
    }
  }

  return { updatedDependencies, updateSummary };
}

/**
 * runBuildHook runs the `build` hook found in mod.ts. In the context of
 * `install-update`, this is in order to cache the dependency version
 * updates that occurred.
 */
function runBuildHook(): void {
  try {
    const { hooks: { build } } = projectScripts([]);
    const buildArgs = build.split(" ");

    // TODO: move to Deno.command only compatible with
    // @ts-ignore: Deno.run is deprecated but still needed for compatibility
    // deno-lint-ignore no-deprecated-deno-api
    Deno.run({ cmd: buildArgs });
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(err.message, { cause: err });
    }
    throw new Error(
      `Caught non-Error value: ${String(err)} (type: ${typeof err})`,
    );
  }
}

if (import.meta.main) {
  const protocol = getProtocolInterface(Deno.args);
  protocol.respond(JSON.stringify(await updateDependencies()));
}
