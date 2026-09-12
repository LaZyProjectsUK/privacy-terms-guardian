const esbuild = require("esbuild");

const watch = process.argv.includes("--watch");

const options = {
  entryPoints: {
    background: "src/background.ts",
    content: "src/content.ts",
    popup: "src/popup.ts",
    sidebar: "src/sidebar.ts",
  },
  bundle: true,
  outdir: "dist",
  format: "esm",
  target: "chrome110",
  sourcemap: true,
};

async function run() {
  if (watch) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
    console.log("esbuild watching...");
  } else {
    await esbuild.build(options);
    console.log("esbuild build complete.");
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
