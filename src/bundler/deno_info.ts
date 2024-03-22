// [@mniemer prototype for non-bundled executable]
// This helper executes the command `deno info --json --no-remote <function file>`
// It produces a JSON list of dependencies for a given source file.
// The --no-remote flag tells the process to ignore any remote dependencies, 
// since those will be fetched and cached separately via `deno vendor`
export const DenoInfo = {
  info: async (entrypoint: string): Promise<any> => {
    const command = new Deno.Command(Deno.execPath(), {
      args: [
        "info",
        "--json",
        "--no-remote",
        entrypoint,
      ],
    });

    const { code, stdout, stderr } = await command.output();

    // TODO: Handle error scenarios from command output
    const metadataJson = new TextDecoder().decode(stdout);
    return JSON.parse(metadataJson);
  },
};
