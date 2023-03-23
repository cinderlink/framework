// tsup.config.ts
import { defineConfig } from "tsup";
var tsup_config_default = defineConfig({
  entry: ["src/**/*.ts", "!src/**/*.test.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  external: [
    "did-jwt",
    "dids",
    "emittery",
    "ipfs-core-types",
    "libp2p",
    "multiformats",
    "@cinderlink/tsconfig",
    "@libp2p/interface-connection",
    "@libp2p/interface-peer-id",
    "ajv",
    "it-pushable",
    "minisearch",
  ],
});
export { tsup_config_default as default };
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidHN1cC5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9faW5qZWN0ZWRfZmlsZW5hbWVfXyA9IFwiL1VzZXJzL2FuZHJld2V3aW5nL3Byb2plY3RzL2NhbmRvci9jb3JlL3BhY2thZ2VzL2NvcmUtdHlwZXMvdHN1cC5jb25maWcudHNcIjtjb25zdCBfX2luamVjdGVkX2Rpcm5hbWVfXyA9IFwiL1VzZXJzL2FuZHJld2V3aW5nL3Byb2plY3RzL2NhbmRvci9jb3JlL3BhY2thZ2VzL2NvcmUtdHlwZXNcIjtjb25zdCBfX2luamVjdGVkX2ltcG9ydF9tZXRhX3VybF9fID0gXCJmaWxlOi8vL1VzZXJzL2FuZHJld2V3aW5nL3Byb2plY3RzL2NhbmRvci9jb3JlL3BhY2thZ2VzL2NvcmUtdHlwZXMvdHN1cC5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidHN1cFwiO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBlbnRyeTogW1wic3JjLyoqLyoudHNcIiwgXCIhc3JjLyoqLyoudGVzdC50c1wiXSxcbiAgZm9ybWF0OiBbXCJlc21cIiwgXCJjanNcIl0sXG4gIGR0czogdHJ1ZSxcbiAgc291cmNlbWFwOiB0cnVlLFxuICBleHRlcm5hbDogW1xuICAgIFwiZGlkLWp3dFwiLFxuICAgIFwiZGlkc1wiLFxuICAgIFwiZW1pdHRlcnlcIixcbiAgICBcImlwZnMtY29yZS10eXBlc1wiLFxuICAgIFwibGlicDJwXCIsXG4gICAgXCJtdWx0aWZvcm1hdHNcIixcbiAgICBcIkBjYW5kb3IvdHNjb25maWdcIixcbiAgICBcIkBsaWJwMnAvaW50ZXJmYWNlLWNvbm5lY3Rpb25cIixcbiAgICBcIkBsaWJwMnAvaW50ZXJmYWNlLXBlZXItaWRcIixcbiAgICBcImFqdlwiLFxuICAgIFwiaXQtcHVzaGFibGVcIixcbiAgICBcIm1pbmlzZWFyY2hcIixcbiAgXSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUErVCxTQUFTLG9CQUFvQjtBQUU1VixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixPQUFPLENBQUMsZUFBZSxtQkFBbUI7QUFBQSxFQUMxQyxRQUFRLENBQUMsT0FBTyxLQUFLO0FBQUEsRUFDckIsS0FBSztBQUFBLEVBQ0wsV0FBVztBQUFBLEVBQ1gsVUFBVTtBQUFBLElBQ1I7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
