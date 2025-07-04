const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '../dist');
const oldHtmlPath = path.join(distDir, 'src/popup/index.html');
const newPopupDir = path.join(distDir, 'popup');
const newHtmlPath = path.join(newPopupDir, 'index.html');
const oldSrcPopupDir = path.join(distDir, 'src/popup');
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
      console.log('[PostBuild] Script finished successfully.');
    } else {
      console.log(`[PostBuild] ${oldHtmlPath} not found. No action taken.`);
    }
  } catch (error) {
    console.error('[PostBuild] Error during post-build script:', error);
    process.exit(1); // Exit with error code
  }
}

postBuild();
