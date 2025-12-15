import { build } from "esbuild";
import { readFile } from "fs/promises";

async function buildWorker() {
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  
  // Dependencies to bundle
  const bundleDeps = [
    "hono",
    "hono/cors",
    "bcryptjs",
    "jsonwebtoken",
    "drizzle-orm",
    "drizzle-orm/d1",
    "@shared/schema",
  ];

  // All dependencies to externalize except bundleDeps
  const allDeps = Object.keys(pkg.dependencies || {});
  const externals = allDeps.filter((dep) => !bundleDeps.some((bundle) => dep.startsWith(bundle.split("/")[0])));

  await build({
    entryPoints: ["src/worker.ts"],
    bundle: true,
    format: "esm",
    outfile: "dist/worker.mjs",
    platform: "neutral",
    target: "es2022",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    external: [
      ...externals,
      "@cloudflare/workers-types",
    ],
    minify: true,
    sourcemap: true,
    logLevel: "info",
  });

  console.log("✅ Worker built successfully!");
}

buildWorker().catch((err) => {
  console.error(err);
  process.exit(1);
});

