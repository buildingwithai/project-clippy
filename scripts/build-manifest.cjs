const fs = require('fs');
const path = require('path');

// Copy manifest
const srcManifest = path.resolve(__dirname, '../manifest.template.json');
const destManifest = path.resolve(__dirname, '../dist/manifest.json');
fs.copyFileSync(srcManifest, destManifest);
console.log('Manifest copied to dist/manifest.json');

// Copy popup HTML to correct location
const srcHtml = path.resolve(__dirname, '../dist/src/popup/index.html');
const destHtml = path.resolve(__dirname, '../dist/popup/index.html');
if (fs.existsSync(srcHtml)) {
  fs.copyFileSync(srcHtml, destHtml);
  console.log('Popup HTML copied to dist/popup/index.html');
} else {
  console.warn('Popup HTML not found at dist/src/popup/index.html');
}
