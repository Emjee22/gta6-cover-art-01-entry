// Neon Night Cover Studio — entrypoint: copies app/ and screenshots/ into the
// output directory and writes the dossier buildDossier produces from them.
import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDossier } from './vendor/makefun-app.ts';

const outDir = process.env.MAKEFUN_OUTPUT_DIR || 'out';
mkdirSync(outDir, { recursive: true });
cpSync('app', join(outDir, 'app'), { recursive: true });
cpSync('screenshots', join(outDir, 'screenshots'), { recursive: true });
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);
