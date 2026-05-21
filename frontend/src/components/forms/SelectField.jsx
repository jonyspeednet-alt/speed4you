function SelectField({ value, onChange, options, label, placeholder, id, ...props }) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div style={styles.container}>
      {label && <label htmlFor={selectId} style={styles.label}>{label}</label>}
      <select
        id={selectId}
        value={value}
        onChange={onChange}
        style={styles.select}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-xs)',
  },
  label: {
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
  },
  select: {
    padding: '12px 16px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    fontSize: '1rem',
    cursor: 'pointer',
  },
};

export default SelectField;