export class BundleError extends Error {
  constructor(options?: ErrorOptions) {
    super("Error bundling function file", options);
  }
}
