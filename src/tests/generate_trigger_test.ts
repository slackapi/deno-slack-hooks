import { generateTriggerFile } from "../generate_trigger.ts";
import { assert, assertEquals } from "../dev_deps.ts";

Deno.test("generateTriggerFile creates a valid TS file", async () => {
  const input: string[] = [`--source={ "triggers": \
    [{ "type": "shortcut", \
    "name": "test trigger", \
    "description": "Testing file generation", \
    "workflow": {"callback_id": "test_trigger"}, \
     "inputs":{ \
      "interaction": {"value":"{{data.interactivity}}"}
      } 
    }]}`];

  const result = await generateTriggerFile(input);
  const file = await import(`file://${Deno.cwd() + "/" + result.files[0]}`);

  // Directory exists
  const dirInfo = await Deno.stat("triggers");
  assert(dirInfo.isDirectory);
  // File exists
  const fileInfo = await Deno.stat(result.files[0]);
  assert(fileInfo.isFile);
  // Trigger definition has the expected fields
  const actual = file.default;
  assertEquals(actual.type, "shortcut");
  assertEquals(actual.name, "test trigger");
  assertEquals(actual.description, "Testing file generation");
  assertEquals(actual.workflow, "#/workflows/test_trigger");
  assertEquals(actual.inputs, {
    interaction: { value: "{{data.interactivity}}" },
  });

  // Clean up
  await Deno.remove("triggers", { recursive: true });
});

Deno.test("generateTriggerFile creates multiple TS files", async () => {
  const input: string[] = [`--source={ "triggers": \
    [ \
      { "type": "shortcut", \
      "name": "test trigger 1", \
      "workflow": {"callback_id": "test_1"} \
      }, \
      { "type": "shortcut", \
      "name": "test trigger 2", \
      "workflow": {"callback_id": "test_2"} \
      } \
  ]}`];

  const result = await generateTriggerFile(input);

  // Files exist
  const fileInfo1 = await Deno.stat(result.files[0]);
  assert(fileInfo1.isFile);
  const fileInfo2 = await Deno.stat(result.files[1]);
  assert(fileInfo2.isFile);

  // Clean up
  await Deno.remove("triggers", { recursive: true });
});
