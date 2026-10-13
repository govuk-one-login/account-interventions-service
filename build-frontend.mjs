import esbuild from 'esbuild';
import { cpSync, rmSync, readFileSync, writeFileSync } from 'node:fs';

const outdir = 'dist/frontend';
const stagePrefix = process.env['STAGE_PREFIX'] ?? '/v1';

// Clean previous build
rmSync(outdir, { recursive: true, force: true });

// Bundle the Lambda handler
await esbuild.build({
  entryPoints: ['src/handlers/frontend-handler.ts'],
  bundle: true,
  platform: 'node',
  target: 'es2022',
  format: 'esm',
  outExtension: { '.js': '.mjs' },
  external: ['@aws-sdk/*', 'node:*'],
  outdir,
  minify: true,
  sourcemap: false,
  // Bundled CJS dependencies (e.g. @aws-lambda-powertools/*) still call require()
  // internally for Node built-ins. ESM has no require(), so esbuild's own shim for
  // this throws "Dynamic require of ... is not supported" at runtime. This banner
  // reintroduces a working require() via node:module's createRequire, scoped to
  // this file, so those internal calls resolve correctly.
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);",
  },
});

// Copy nunjucks view templates
cpSync('src/frontend/views', `${outdir}/views`, { recursive: true });

// Copy govuk-frontend dist so static files and templates resolve at runtime
cpSync('node_modules/govuk-frontend/dist', `${outdir}/node_modules/govuk-frontend/dist`, {
  recursive: true,
});

// Rewrite hardcoded /assets/ paths in govuk-frontend.min.css to include the stage prefix.
// These paths (fonts, images) are baked into the compiled CSS and are not affected by
// the nunjucks assetPath variable.
if (stagePrefix) {
  const cssPath = `${outdir}/node_modules/govuk-frontend/dist/govuk/govuk-frontend.min.css`;
  const css = readFileSync(cssPath, 'utf8');
  const patched = css.replaceAll('url(/assets/', () => `url(${stagePrefix}/assets/`);
  writeFileSync(cssPath, patched);
  console.log(`Patched asset paths in govuk-frontend.min.css with prefix: ${stagePrefix}`);
}

console.log(`Frontend build complete → ${outdir}/`);
