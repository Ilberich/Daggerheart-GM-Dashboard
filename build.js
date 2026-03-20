#!/usr/bin/env node
// §BUILD_SCRIPT
// Bundles GM Dashboard into a single self-contained dist/index.html
// No npm dependencies — plain Node.js fs/path only.
// Usage: node build.js

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');

// Read source files
const html    = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const css     = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
const marked  = fs.readFileSync(path.join(ROOT, 'vendor', 'marked-compat.js'), 'utf8');
const appJs   = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');

// Inline vendor marked (replaces external <script src="vendor/marked-compat.js">)
const inlineMarked = `<script>/* §VENDOR_MARKED */\n${marked}\n</script>`;

// Inline styles.css (replaces <link rel="stylesheet" href="styles.css">)
const inlineCSS = `<style>/* §STYLES */\n${css}\n</style>`;

// Inline app.js (replaces external <script src="app.js">)
const inlineApp = `<script>/* §APP_JS */\n${appJs}\n</script>`;

// Perform substitutions
let bundle = html;
bundle = bundle.replace('<script src="vendor/marked-compat.js"></script>', inlineMarked);
bundle = bundle.replace('<link rel="stylesheet" href="styles.css">', inlineCSS);
bundle = bundle.replace('<script src="app.js"></script>', inlineApp);

// Write output
if (!fs.existsSync(DIST)) fs.mkdirSync(DIST);
const outPath = path.join(DIST, 'index.html');
fs.writeFileSync(outPath, bundle, 'utf8');

const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
console.log(`Built: dist/index.html  (${kb} KB)`);
