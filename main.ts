// Bastion Breach: round-based tactical FPS, 5v5 bots, bomb plant/defuse at Sites A/B,
// buy menu + economy, 3 weapons, and procedural WebAudio.
// Copies game/ and screenshots/ to output and builds the dossier.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-threejs.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Verify screenshots exist and hold 3-4 files before proceeding
const screenshotsDir = join(here, 'screenshots');
if (!existsSync(screenshotsDir)) {
  throw new Error('Missing screenshots/ directory; cannot ship entry without screenshots.');
}
const screenshotFiles = readdirSync(screenshotsDir);
if (screenshotFiles.length < 3 || screenshotFiles.length > 4) {
  throw new Error(`screenshots/ must hold 3-4 files, found ${screenshotFiles.length}`);
}

// Verify game files exist before proceeding
const gameDir = join(here, 'game');
if (!existsSync(join(gameDir, 'index.html'))) {
  throw new Error('Missing game/index.html; cannot ship entry without game entrypoint.');
}
const threeModulePath = join(gameDir, 'vendor', 'three', 'three.module.min.js');
const threeCorePath = join(gameDir, 'vendor', 'three', 'three.core.min.js');
if (!existsSync(threeModulePath) || !existsSync(threeCorePath)) {
  throw new Error('Missing vendored three.js files in game/vendor/three/; cannot ship entry.');
}

function countFiles(dir: string): number {
  let count = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      count += countFiles(join(dir, entry.name));
    } else {
      count++;
    }
  }
  return count;
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(screenshotsDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all: game/ counts beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, game_max_files: 993, game_max_bytes: 50331648 }),
);

const gameFilesCount = countFiles(join(out, 'game'));
const screenshotsCount = readdirSync(join(out, 'screenshots')).length;
const dossierSize = statSync(join(out, 'dossier.json')).size;
console.log(`[dossier] game files: ${gameFilesCount}, screenshots: ${screenshotsCount}, dossier bytes: ${dossierSize}`);

