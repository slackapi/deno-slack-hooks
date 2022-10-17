import { parse } from "./deps.ts";

export type WorkflowRecord = {
  "callback_id": string;
};

interface Inputs {
  [key: string]: { value: string };
}

export type TriggerFileRecord = {
  "type": string;
  "name": string;
  "description"?: string;
  "workflow": WorkflowRecord;
  "inputs"?: Inputs;
};

export type TriggersPayload = {
  triggers: TriggerFileRecord[];
};

export interface Response {
  ok: boolean;
  files: Array<string>;
  error?: {
    message: string;
  } | null;
}

const generateTriggerFile = async (): Promise<Response> => {
  // Parse JSON payload
  const source = parse(Deno.args).source as string;
  if (!source) throw new Error("A source path needs to be defined");
  const payload: TriggersPayload = JSON.parse(source);

  // Sort alphabetically
  payload.triggers.sort((a, b) => a.name.localeCompare(b.name));

  // Create the triggers directory if it does not exist
  const directory = "triggers";
  try {
    await Deno.stat(directory);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) { // create directory
      await Deno.mkdir(directory);
    } else {
      throw error;
    }
  }

  // Generate the files
  const files: Array<string> = [];
  await Promise.all(payload.triggers.map(async (tr: TriggerFileRecord) => {
    const templateString = SlackTriggerTemplate(tr);
    const filename = directory + `/${tr.workflow.callback_id}.ts`;

    await Deno.writeTextFile(filename, templateString);
    files.push(filename);
  }));

  return { ok: true, files: files };
};

const autogeneratedComment = () => {
  const time = new Date();
  return `/** This file was autogenerated on ${time.toDateString()}. **/`;
};

export const SlackTriggerTemplate = (tr: TriggerFileRecord) => {
  const camelCase = tr.workflow.callback_id.toLowerCase().replace(
    /[^a-zA-Z0-9]+(.)/g,
    (_, chr) => chr.toUpperCase(),
  );

  let inputValues = ``;
  // Add interactivity param to trigger inputs if present
  if (tr.inputs) {
    for (const prop in tr.inputs) {
      if (tr.inputs[prop].value.includes("interactivity")) {
        inputValues += `    
  ${prop}: {
    value: "{{data.interactivity}}",
  },
`;
      }
    }
  }

  return `${autogeneratedComment()}
import { Trigger } from "deno-slack-api/types.ts";

/**
* Triggers determine when Workflows are executed. A trigger
* file describes a scenario in which a workflow should be run,
* such as a user pressing a button or when a specific event occurs.
* https://api.slack.com/future/triggers
*/
const ${camelCase}Trigger: Trigger = {
  type: "${tr.type}",
  name: "${tr.name}",
  description: "${tr.description || ""}",
  workflow: "#/workflows/${tr.workflow.callback_id}",
  inputs: {${inputValues}},
};

export default ${camelCase}Trigger; 
`;
};

if (import.meta.main) {
  console.log(JSON.stringify(await generateTriggerFile()));
}
