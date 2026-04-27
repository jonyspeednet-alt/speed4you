/**
 * This file is now a facade to the refactored store modules in the ./store directory.
 * Importing this file will still work as before, but the logic is now split into smaller files.
 */
module.exports = require('./store/index');
