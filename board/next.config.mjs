/** @type {import('next').NextConfig} */
export default {
  experimental: {
    // @napi-rs/canvas is a native module: webpack cannot parse a .node binary,
    // and bundling it fails the build outright. Listing it here leaves it to
    // Node's own require at runtime, which is the only thing that can load it.
    // Next 15 renames this to the top-level `serverExternalPackages`.
    serverComponentsExternalPackages: ["@napi-rs/canvas"],
  },
};
