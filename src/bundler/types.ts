type BundleContentType =
  | string
  | ReadableStream<string>
  | Uint8Array
  | ReadableStream<Uint8Array>;

export interface Bundler {
  bundle(): Promise<BundleContentType>;
}
