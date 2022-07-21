import { checkForSDKUpdates, Release } from "./check_update.ts";
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
  const updatableReleases = releases.filter((r) => r.current && r.latest);
  const updateResp = await createUpdateResp(updatableReleases);

  // If no errors occurred during installation, re-build
  // project as a means to cache the changes
  if (!updateResp.error) {
    try {
      // TODO :: This try/catch should be nested within createUpdateResp
      // but doing so surfaces an issue with the --allow-run flag not
      // being used, despite its presence and success at this level
      runBuildHook();
    } catch (err) {
      updateResp.error = { message: err.message };
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

    // Update import_map.json with latest dependency versions
    const importsUpdateResp = await updateDependencyFile(
      `${cwd}/import_map.json`,
      releases,
    );

    // Update slack.json with latest dependency versions
    const hooksUpdateResp = await updateDependencyFile(
      `${cwd}/slack.json`,
      releases,
    );

    updateResp.updates = [...importsUpdateResp, ...hooksUpdateResp];
  } catch (err) {
    updateResp.error = { message: err.message };
  }

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
    const dependencyMap = await getJSON(path);
    const { imports, hooks } = dependencyMap;

    // If file doesn't exist or expected dependency key is missing
    if (!imports && !hooks) return [];

    const dependencyKey = imports ? "imports" : "hooks";

    // Update only the dependency-related key in given file ("imports" or "hooks")
    const { updatedDependencies, updateSummary } = updateDependencyMap(
      dependencyMap[dependencyKey],
      releases,
    );

    // Replace the dependency-related section with the updated version
    dependencyMap[dependencyKey] = updatedDependencies;
    await Deno.writeTextFile(
      path,
      JSON.stringify(dependencyMap, null, 2).concat("\n"),
    );

    return updateSummary;
  } catch (err) {
    throw new Error(err);
  }
}

/**
 * updateDependencyMap takes in a map of the dependencies' key/value pairs and,
 * if an update exists for a dependency of the same name in the releases provided,
 * replaces the existing version with the latest version of the dependency. Returns
 * an updated map of all dependencies, as well as an update summary of each.
 */
export function updateDependencyMap(
  dependencyMap: { [key: string]: string },
  releases: Release[],
) {
  const updatedDependencies: { [key: string]: string } = { ...dependencyMap };
  const updateSummary: Update[] = [];

  // Loop over key, val pairs of 'imports' or 'hooks', depending on file provided
  for (const [key, val] of Object.entries(updatedDependencies)) {
    for (const { name, current, latest } of releases) {
      // If the dependency matches an available release,
      // and an update is available, replace the version
      if (current && latest && val.includes(name)) {
        updatedDependencies[key] = updatedDependencies[key].replace(
          current,
          latest,
        );
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
    Deno.run({ cmd: buildArgs });
  } catch (err) {
    throw new Error(err);
  }
}

if (import.meta.main) {
  console.log(JSON.stringify(await updateDependencies()));
}
