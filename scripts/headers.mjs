#!/usr/bin/env node
// Writes dist/_headers for Workers static assets. It has to sit at the assets root (dist/), not in dist/docs/, so it
// can't come from public/. Astro's hashed files never change: browsers may keep them for a year.
import { writeFileSync } from 'node:fs';

writeFileSync(
  'dist/_headers',
  ['/docs/_astro/*', '  Cache-Control: public, max-age=31536000, immutable', ''].join('\n'),
);
console.log('headers: ✓ dist/_headers');
