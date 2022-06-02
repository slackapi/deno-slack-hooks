#!/bin/sh
set -e
# Extract the version for deno-slack-hooks embedded in src/libraries.ts
LIBRARY_TAG=$(grep "\[DENO_SLACK_HOOKS\]:" src/libraries.ts | awk '{print $2}' | cut -c2- | rev | cut -c3- | rev);
# Intended to be used in GitHub CI, so lots of the basic and core branches need to be explicitly pulled in
git fetch origin main;
git checkout main;
git pull --tags origin main;
# Grab the latest git tag available on the origin remote
GIT_TAG=$(git describe --tags --abbrev=0);

if [ "$GIT_TAG" = "$LIBRARY_TAG" ]; then
  echo "Versions consistent; we good.";
  exit 0;
fi
echo "Version inconsistency detected! BIG TROUBLE!";
echo "Latest deno-slack-hooks git tag detected: ${GIT_TAG}";
echo "Latest deno-slack-hooks version embedded in src/libraries.ts detected: ${LIBRARY_TAG}";
echo "Make sure these are the same!";
exit 1;
