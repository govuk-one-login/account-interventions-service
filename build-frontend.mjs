import esbuild from 'esbuild';
import { cpSync, rmSync } from 'node:fs';

const outdir = 'dist/frontend';

// Clean previous build
rmSync(outdir, { recursive: true, force: true });

// Bundle the Lambda handler
await esbuild.build({
  entryPoints: ['src/handlers/frontend-handler.ts'],
  bundle: true,
  platform: 'node',
  target: 'es2022',
  outdir,
  minify: true,
  sourcemap: false,
});

// Copy nunjucks view templates
cpSync('src/frontend/views', `${outdir}/views`, { recursive: true });

// Copy govuk-frontend dist so static files and templates resolve at runtime
cpSync('node_modules/govuk-frontend/dist', `${outdir}/node_modules/govuk-frontend/dist`, {
  recursive: true,
});

console.log(`Frontend build complete → ${outdir}/`);
