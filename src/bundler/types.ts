type BundleContentType =
  | Uint8Array
  | void;

export interface Bundler {
  bundle(): Promise<BundleContentType>;
}
