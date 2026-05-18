import sys

file_path = "c:\\Users\\Speed Net IT\\Documents\\codex local ai test\\isp-entertainment-portal\\backend\\src\\data\\store.js"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# I need to find the `pruneCatalog()` function block which I corrupted.
# It starts at `async function pruneCatalog() {` and currently ends abruptly.

# Let's restore the original `pruneCatalog` and `getDuplicateGroupsForItems`.

restored_block = """async function pruneCatalog() {
  await ensureContentStore();
  const { items } = await listItems({}, 0, null, 'latest', false);
  const toDelete = [];

  for (const item of items) {
    const isJunk = JUNK_REGEX.test(item.title) || (item.sourcePath && JUNK_REGEX.test(item.sourcePath));
    if (isJunk) {
      toDelete.push(item.id);
      continue;
    }

    if (item.sourcePath && fs.existsSync(item.sourcePath)) {
      try {
        const stats = fs.statSync(item.sourcePath);
        const minSize = item.type === 'series' ? MIN_EPISODE_SIZE : MIN_MOVIE_SIZE;
        if (stats.size < minSize) {
          toDelete.push(item.id);
        }
      } catch {
        // Skip if stat fails
      }
    } else if (item.sourcePath) {
      // Path defined but missing
      toDelete.push(item.id);
    }
  }

  if (toDelete.length) {
    await db.query('DELETE FROM content_catalog WHERE id = ANY($1)', [toDelete]);
  }

  return { deletedCount: toDelete.length };
}

async function vacuumDatabase() {
  await ensureContentStore();
  if (!db.isInMemory) {
    try {
      await db.query('VACUUM ANALYZE content_catalog');
      await db.query('VACUUM ANALYZE app_state');
      await db.query('VACUUM ANALYZE scanner_runs');
      return { success: true };
    } catch (err) {
      console.error('Vacuum failed:', err);
      return { success: false, error: err.message };
    }
  }
  return { success: true };
}

async function getDuplicateGroupsForItems(items = []) {
  if (!items.length) {
    return new Map();
  }

  await ensureContentStore();
  const keys = [...new Set(items.map((item) => `${item.type}:${item.titleKey || normalizeTitleKey(item.title)}`))];
  const conditions = [];
  const params = [];

  keys.forEach((key) => {
    const [type, titleKey] = key.split(':');
    params.push(type);
    const typeIndex = params.length;
    params.push(titleKey);
    const titleKeyIndex = params.length;
    conditions.push(`(content_type = $${typeIndex} AND title_key = $${titleKeyIndex})`);
  });

  const result = await db.query(
    `SELECT payload
     FROM content_catalog
     WHERE ${conditions.join(' OR ')}`,
    params,
  );

  const groups = new Map();
  result.rows.forEach((row) => {
    const item = normalizeItem(row.payload);
    const key = `${item.type}:${item.titleKey || normalizeTitleKey(item.title)}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(item);
  });

  return groups;
}"""

# Use regex to replace everything from `async function pruneCatalog()` to `return groups;\n}`

import re

new_content = re.sub(r'async function pruneCatalog\(\).*?return groups;\n\}', restored_block, content, flags=re.DOTALL)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)

# We also need to add vacuumDatabase to the exports at the bottom
with open(file_path, "r", encoding="utf-8") as f:
    content_again = f.read()

if "vacuumDatabase," not in content_again:
    content_again = content_again.replace("pruneCatalog,", "pruneCatalog,\n  vacuumDatabase,")
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content_again)
