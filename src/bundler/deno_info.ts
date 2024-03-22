// [@mniemer prototype for double-upload src code copy]
// This helper executes the command `deno info --json --no-remote <function file>`
// It produces a JSON list of dependencies for a given source file.
// The --no-remote flag tells the process to ignore any remote dependencies, 
// since those are not relevant for the code download feature
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