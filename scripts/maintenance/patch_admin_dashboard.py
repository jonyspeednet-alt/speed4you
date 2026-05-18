import sys

with open("frontend/src/pages/admin/AdminDashboard.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Replace Red/Orange primary gradient with Teal gradient
bad_gradient = "background: 'linear-gradient(135deg, var(--accent-red), #ff8a54)', color: '#fff', fontWeight: '700', boxShadow: '0 12px 30px rgba(255,90,95,0.24)'"
good_gradient = "background: 'linear-gradient(135deg, var(--accent-cyan), #05d5a1)', color: '#000', fontWeight: '800', boxShadow: '0 12px 30px rgba(0, 240, 181, 0.24)'"
content = content.replace(bad_gradient, good_gradient)

# Enhance Hero card
bad_hero = "background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',"
good_hero = "background: 'linear-gradient(135deg, rgba(0,240,181,0.08), rgba(0,240,181,0.02))',"
content = content.replace(bad_hero, good_hero)

# Enhance Stats card hover
bad_statCard = "statCard: { padding: '24px', borderRadius: '28px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'grid', gap: '8px' },"
good_statCard = "statCard: { padding: '24px', borderRadius: '28px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'grid', gap: '8px', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default' },"
content = content.replace(bad_statCard, good_statCard)

# Enhance Log Box to look like terminal
bad_logbox = "logBox: { marginTop: '6px', padding: '10px 12px', borderRadius: '12px', background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.08)', maxHeight: '180px', overflowY: 'auto', fontSize: '0.75rem', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', color: 'var(--text-secondary)', lineHeight: '1.45' },"
good_logbox = "logBox: { marginTop: '6px', padding: '12px 16px', borderRadius: '12px', background: '#0d1117', border: '1px solid #30363d', maxHeight: '200px', overflowY: 'auto', fontSize: '0.8rem', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', color: '#00F0B5', lineHeight: '1.6', boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.4)' },"
content = content.replace(bad_logbox, good_logbox)

# Change viewAll link color to cyan
bad_viewAll = "viewAll: { color: 'var(--accent-red)', fontSize: '0.9rem', fontWeight: '700' },"
good_viewAll = "viewAll: { color: 'var(--accent-cyan)', fontSize: '0.9rem', fontWeight: '700' },"
content = content.replace(bad_viewAll, good_viewAll)

# Change Note card background
bad_notecard = "noteCard: { padding: '20px', borderRadius: '24px', background: 'linear-gradient(135deg, rgba(255,200,87,0.08), rgba(255,255,255,0.04))', border: '1px solid rgba(255,255,255,0.08)' },"
good_notecard = "noteCard: { padding: '20px', borderRadius: '24px', background: 'linear-gradient(135deg, rgba(0,240,181,0.08), rgba(255,255,255,0.04))', border: '1px solid rgba(0,240,181,0.1)' },"
content = content.replace(bad_notecard, good_notecard)

with open("frontend/src/pages/admin/AdminDashboard.jsx", "w", encoding="utf-8") as f:
    f.write(content)
