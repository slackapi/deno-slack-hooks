// [@mniemer prototype for non-bundled executable]
// This helper executes the command `deno vendor <function file list>`
// It fetches all dependencies from remote and places them in a subdirectory called 'vendor',
// then updates the deno.jsonc file to use import_map in the vendor directory.

// Side note: I experimented a bit using --node-modules-dir to have this vendor command also cache npm modules.
// Including this flag produced a node_modules dir in the output directory containing cached versions of required npm modules.
// However the contents of this dir contained symlinks which caused the zip step in slack-cli to fail,
// so I was unable to confirm if this is a valid strategy for including npm deps for ROSI functions.
export const DenoVendor = {
	vendor: async (outputDirectory: string, entrypoints: string[]): Promise<void> => {
		// change dir to output directory when running the vendor command
		const cwd = Deno.cwd();
		Deno.chdir(outputDirectory);

		const command = new Deno.Command(Deno.execPath(), {
		args: [
		  "vendor",
		  ...entrypoints,
		],
	  });
	  const { code, stdout, stderr } = await command.output();
	  // TODO: Handle error scenarios from command output

	  // chage dir back to original working directory
	  Deno.chdir(cwd);
	},
  };
  