import sys

# Patch ContentLibraryPage.jsx
with open("frontend/src/pages/admin/ContentLibraryPage.jsx", "r", encoding="utf-8") as f:
    lib_content = f.read()

# Replace primary gradient to Teal
lib_content = lib_content.replace(
    "background: 'linear-gradient(135deg, #ff744f, #ffb347)', color: '#fff'",
    "background: 'linear-gradient(135deg, var(--accent-cyan), #05d5a1)', color: '#000'"
)
# Replace rootCardActive gradient to Teal
lib_content = lib_content.replace(
    "background: 'linear-gradient(135deg, rgba(255,116,79,0.14), rgba(125,249,255,0.1))'",
    "background: 'linear-gradient(135deg, rgba(0,240,181,0.14), rgba(125,249,255,0.1))'"
)
# Replace quickChipActive gradient to Teal
lib_content = lib_content.replace(
    "background: 'linear-gradient(135deg, rgba(255,116,79,0.18), rgba(125,249,255,0.12))'",
    "background: 'linear-gradient(135deg, rgba(0,240,181,0.18), rgba(125,249,255,0.12))'"
)
# Replace metricCardAccent gradient
lib_content = lib_content.replace(
    "background: 'linear-gradient(135deg, rgba(255,116,79,0.18), rgba(125,249,255,0.12))'",
    "background: 'linear-gradient(135deg, rgba(0,240,181,0.18), rgba(125,249,255,0.12))'"
)

with open("frontend/src/pages/admin/ContentLibraryPage.jsx", "w", encoding="utf-8") as f:
    f.write(lib_content)


# Patch AddContentPage.jsx
with open("frontend/src/pages/admin/AddContentPage.jsx", "r", encoding="utf-8") as f:
    add_content = f.read()

# Replace submitBtn gradient to Teal
add_content = add_content.replace(
    "background: 'linear-gradient(135deg, #ff744f, #ffb347)', color: '#fff'",
    "background: 'linear-gradient(135deg, var(--accent-cyan), #05d5a1)', color: '#000'"
)

# Improve inputs focus ring (we will simulate it by adding focus ring transition to inputs)
# To do it properly in inline styles is tricky since :focus is not supported.
# But we can at least improve the border radius and background.
add_content = add_content.replace(
    "input: { padding: '14px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', color: 'var(--text-primary)', fontSize: '0.98rem' }",
    "input: { padding: '14px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(0,240,181,0.2)', borderRadius: '14px', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }"
)
add_content = add_content.replace(
    "select: { padding: '14px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', color: 'var(--text-primary)', fontSize: '0.98rem' }",
    "select: { padding: '14px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(0,240,181,0.2)', borderRadius: '14px', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none' }"
)
add_content = add_content.replace(
    "textarea: { padding: '14px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', color: 'var(--text-primary)', fontSize: '0.98rem', resize: 'vertical' }",
    "textarea: { padding: '14px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(0,240,181,0.2)', borderRadius: '14px', color: 'var(--text-primary)', fontSize: '1rem', resize: 'vertical', outline: 'none' }"
)

with open("frontend/src/pages/admin/AddContentPage.jsx", "w", encoding="utf-8") as f:
    f.write(add_content)
