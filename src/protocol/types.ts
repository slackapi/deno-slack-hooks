/**
 * An interface encapsulating a specific set of communication rules that both the SDK
 * and the CLI implement.
 */
export interface Protocol {
  /**
   * Logging utility allowing for SDK or userland code to log diagnostic info that will be surfaced by the CLI.
   */
  log: typeof console.log;
  /**
   * Logging utility allowing for SDK or userland code to log error info that will be surfaced by the CLI.
   */
  error: typeof console.error;
  /**
   * Logging utility allowing for SDK or userland code to provide warnings that will be surfaced by the CLI.
   */
  warn: typeof console.warn;
  /**
   * Utility method for responding to CLI hook invocations.
   * @param data Stringified JSON to return to the CLI
   * @returns
   */
  respond: (data: string) => void;
  /**
   * Retrieve all command-line flags related to the specific protocol implementation. May be useful if child processes are being
   * spawned by the SDK, such as in local-run mode of deno-slack-runtime.
   * @returns string[] An array of strings representing any protocol-specific command-line flags passed from the CLI to the hook, if applicable
   * to the specific protocol implementation
   */
  getCLIFlags?: () => string[];
  /**
   * If exists, provides the SDK an opportunity for the protocol to 'install' itself into the runtime.
   * Inspired by mocking/testing utilities' setup/teardown methods for stubbing/mocking out functionality.
   * Ensures, for example, that any protocol's expectations around stdout/stderr usage is honoured by userland or SDK code.
   * @returns
   */
  install?: () => void;
  /**
   * If exists, provides the SDK an opportunity for the protocol to 'uninstall' itself from the runtime.
   * @returns
   */
  uninstall?: () => void;
}
