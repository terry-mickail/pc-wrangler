// Compatibility shim during the Six Axes migration.
// The nav now lives in components/six-axes-nav.tsx. This file keeps the old
// import path working so every page still doing
//   import WranglerNav from "@/components/wrangler-nav"
// resolves and renders the new consolidated nav. Delete this file once all
// pages import PageShell / six-axes-nav directly.
export { default } from "@/components/six-axes-nav";
