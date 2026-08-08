const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

/**
 * Enhanced directory listing with permission handling
 * Falls back gracefully on permission errors and logs them
 */
function listDirectoryEntriesSafe(dirPath) {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true })
      .filter((entry) => entry.name !== '.duplicate-hold')
      .filter((entry) => !entry.name.startsWith('.'));
  } catch (err) {
    // Permission error - try to handle gracefully
    if (err.code === 'EACCES' || err.code === 'EPERM') {
      console.error(`[scanner] Permission denied accessing ${dirPath}: ${err.message}`);
      return [];
    }
    // Other errors - log and return empty
    console.error(`[scanner] Error accessing ${dirPath}: ${err.message}`);
    return [];
  }
}

/**
 * Check if a directory/file is readable by the scanner user
 */
function isPathReadable(path) {
  try {
    fs.accessSync(path, fs.constants.R_OK);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Check file/directory ownership
 */
function getPathOwnership(path) {
  try {
    const stats = fs.statSync(path);
    return {
      uid: stats.uid,
      gid: stats.gid,
      mode: stats.mode,
      isReadable: isPathReadable(path)
    };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Fix permissions for a path (requires sudo)
 * This is meant to be called from a script with sudo privileges
 */
function fixPathPermissions(path, targetUser = 'www-data', targetGroup = 'www-data') {
  return new Promise((resolve, reject) => {
    const commands = [
      `chown -R ${targetUser}:${targetGroup} "${path}"`,
      `chmod -R 755 "${path}"`,
      `find "${path}" -type f -exec chmod 644 {} +`
    ];

    let i = 0;
    function runNext() {
      if (i >= commands.length) {
        resolve();
        return;
      }

      exec(commands[i], (error, stdout, stderr) => {
        if (error) {
          console.error(`[permission-fix] Command failed: ${commands[i]}`);
          console.error(`[permission-fix] Error: ${error.message}`);
          reject(error);
          return;
        }
        i++;
        runNext();
      });
    }

    runNext();
  });
}

/**
 * Scan for permission issues in a directory tree
 */
function scanPermissionIssues(rootPath, targetUser = 'www-data', targetGroup = 'www-data') {
  const issues = [];

  function scanDir(dirPath) {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        
        const fullPath = path.join(dirPath, entry.name);
        const ownership = getPathOwnership(fullPath);
        
        if (ownership.error) {
          issues.push({
            path: fullPath,
            type: 'error',
            message: ownership.error
          });
        } else if (!ownership.isReadable) {
          issues.push({
            path: fullPath,
            type: 'not_readable',
            uid: ownership.uid,
            gid: ownership.gid,
            mode: ownership.mode
          });
        }

        if (entry.isDirectory()) {
          scanDir(fullPath);
        }
      }
    } catch (err) {
      issues.push({
        path: dirPath,
        type: 'access_error',
        message: err.message
      });
    }
  }

  scanDir(rootPath);
  return issues;
}

module.exports = {
  listDirectoryEntriesSafe,
  isPathReadable,
  getPathOwnership,
  fixPathPermissions,
  scanPermissionIssues
};
