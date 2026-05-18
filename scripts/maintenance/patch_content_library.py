import sys

file_path = "c:\\Users\\Speed Net IT\\Documents\\codex local ai test\\isp-entertainment-portal\\frontend\\src\\pages\\admin\\ContentLibraryPage.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add vacuumLoading state
if "const [vacuumLoading, setVacuumLoading] = useState(false);" not in content:
    content = content.replace(
        "const [pruneLoading, setPruneLoading] = useState(false);",
        "const [pruneLoading, setPruneLoading] = useState(false);\n  const [vacuumLoading, setVacuumLoading] = useState(false);"
    )

# Add handleVacuumDatabase function
if "const handleVacuumDatabase =" not in content:
    handle_vacuum_func = """
  const handleVacuumDatabase = async () => {
    try {
      setVacuumLoading(true);
      setError('');
      setScanStateLabel('Running database maintenance...');
      const res = await adminService.runVacuum();
      setScanStateLabel(res?.success ? 'Database maintenance completed successfully.' : 'Maintenance failed.');
      await loadAuxiliaryData();
    } catch (e) {
      setError(e.message || 'Failed to run database maintenance.');
      setScanStateLabel('');
    } finally {
      setVacuumLoading(false);
      setTimeout(() => setScanStateLabel(''), 4000);
    }
  };
"""
    content = content.replace(
        "const handlePruneCatalog = async () => {",
        handle_vacuum_func + "\n  const handlePruneCatalog = async () => {"
    )

# Add Vacuum button next to Prune button
if ">Optimize DB<" not in content:
    vacuum_button = """            <button
              onClick={handleVacuumDatabase}
              disabled={vacuumLoading || loading}
              style={styles.secondaryBtn}
              title="Run Postgres VACUUM ANALYZE to optimize queries"
            >
              {vacuumLoading ? 'Optimizing...' : 'Optimize DB'}
            </button>"""
    content = content.replace(
        "              {pruneLoading ? 'Pruning...' : 'Prune Catalog'}\n            </button>",
        "              {pruneLoading ? 'Pruning...' : 'Prune Catalog'}\n            </button>\n" + vacuum_button
    )

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
