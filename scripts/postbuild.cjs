const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '../dist');
const oldHtmlPath = path.join(distDir, 'src/popup/index.html');
const newPopupDir = path.join(distDir, 'popup');
const newHtmlPath = path.join(newPopupDir, 'index.html');
const oldSrcPopupDir = path.join(distDir, 'src/popup');

// Overlay paths
const oldOverlayHtmlPath = path.join(distDir, 'src/overlay/index.html');
const newOverlayDir = path.join(distDir, 'overlay');
const newOverlayHtmlPath = path.join(newOverlayDir, 'index.html');
const oldSrcOverlayDir = path.join(distDir, 'src/overlay');
const oldSrcDir = path.join(distDir, 'src');

function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function postBuild() {
  try {
    if (fs.existsSync(oldHtmlPath)) {
      ensureDirSync(newPopupDir);
      fs.renameSync(oldHtmlPath, newHtmlPath); // Moves the file, overwrites if newHtmlPath exists
      console.log(`[PostBuild] Moved ${oldHtmlPath} to ${newHtmlPath}`);

      // Clean up old directories if they are empty
      if (fs.existsSync(oldSrcPopupDir)) {
        const filesInOldSrcPopupDir = fs.readdirSync(oldSrcPopupDir);
        if (filesInOldSrcPopupDir.length === 0) {
          fs.rmdirSync(oldSrcPopupDir);
          console.log(`[PostBuild] Removed empty directory: ${oldSrcPopupDir}`);
        }
      }

      if (fs.existsSync(oldSrcDir)) {
        const filesInOldSrcDir = fs.readdirSync(oldSrcDir);
        if (filesInOldSrcDir.length === 0) {
          fs.rmdirSync(oldSrcDir);
          console.log(`[PostBuild] Removed empty directory: ${oldSrcDir}`);
        } else {
          // If dist/src still has other content, don't remove it.
          // For this project, only popup/index.html seems to be placed under src/.
          console.log(`[PostBuild] Directory ${oldSrcDir} is not empty, not removing.`);
        }
      }
    } else {
      console.log(`[PostBuild] ${oldHtmlPath} not found. No action taken for popup.`);
    }

    // Handle overlay HTML move
    if (fs.existsSync(oldOverlayHtmlPath)) {
      ensureDirSync(newOverlayDir);
      fs.renameSync(oldOverlayHtmlPath, newOverlayHtmlPath);
      console.log(`[PostBuild] Moved ${oldOverlayHtmlPath} to ${newOverlayHtmlPath}`);

      // Clean up old overlay dir if empty
      if (fs.existsSync(oldSrcOverlayDir)) {
        const filesInOldSrcOverlayDir = fs.readdirSync(oldSrcOverlayDir);
        if (filesInOldSrcOverlayDir.length === 0) {
          fs.rmdirSync(oldSrcOverlayDir);
          console.log(`[PostBuild] Removed empty directory: ${oldSrcOverlayDir}`);
        }
      }

      console.log('[PostBuild] Script finished successfully.');
    } else {
      console.log(`[PostBuild] ${oldOverlayHtmlPath} not found. No action taken for overlay.`);
    }
  } catch (error) {
    console.error('[PostBuild] Error during post-build script:', error);
    process.exit(1); // Exit with error code
  }
}

postBuild();
