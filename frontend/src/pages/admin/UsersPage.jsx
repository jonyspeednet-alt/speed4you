import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../../services';

const SURFACE = 'var(--surface, #111318)';
const SURFACE2 = 'var(--surface-2, #181b22)';
const BORDER = 'var(--border-color, rgba(255,255,255,0.07))';
const TEXT = 'var(--text, #f1f5f9)';
const TEXT2 = 'var(--text-2, #94a3b8)';
const TEXT3 = 'var(--text-3, #475569)';
const ACCENT = 'var(--accent-primary, #6366f1)';

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ username: '', ***REMOVED***: '', role: 'admin' });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => adminService.listAdminUsers(),
    refetchInterval: 10000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => adminService.createAdminUser(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }); setShowForm(false); resetForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminService.updateAdminUser(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }); setEditUser(null); setShowForm(false); resetForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminService.deleteAdminUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  function resetForm() { setForm({ username: '', ***REMOVED***: '', role: 'admin' }); }

  function openEdit(user) {
    setEditUser(user);
    setForm({ username: user.username, ***REMOVED***: '', role: user.role });
    setShowForm(true);
  }

  function openCreate() {
    setEditUser(null);
    resetForm();
    setShowForm(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (editUser) {
      const data = {};
      if (form.username !== editUser.username) data.username = form.username;
      if (form.***REMOVED***) data.***REMOVED*** = form.***REMOVED***;
      if (form.role !== editUser.role) data.role = form.role;
      if (Object.keys(data).length) updateMutation.mutate({ id: editUser.id, data });
    } else {
      createMutation.mutate(form);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: TEXT, margin: 0, letterSpacing: '-0.03em' }}>Admin Users</h1>
          <p style={{ fontSize: '0.88rem', color: TEXT3, margin: '4px 0 0 0' }}>Manage admin panel access</p>
        </div>
        <button type="button" onClick={openCreate}
          style={{
            padding: '10px 24px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '700',
            cursor: 'pointer', border: 'none', background: ACCENT, color: '#fff',
          }}>
          + Add User
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: TEXT, margin: 0 }}>
            {editUser ? 'Edit User' : 'Create User'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', alignItems: 'end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.78rem', color: TEXT2, fontWeight: '600' }}>Username</label>
              <input value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} required minLength={2}
                style={{ padding: '10px 12px', borderRadius: '8px', background: SURFACE2, color: TEXT, border: `1px solid ${BORDER}`, fontSize: '0.85rem', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.78rem', color: TEXT2, fontWeight: '600' }}>{editUser ? 'New ***REMOVED*** (leave blank to keep)' : 'Password'}</label>
              <input type="***REMOVED***" value={form.***REMOVED***} onChange={e => setForm(p => ({ ...p, ***REMOVED***: e.target.value }))}
                required={!editUser} minLength={editUser ? 0 : 4}
                style={{ padding: '10px 12px', borderRadius: '8px', background: SURFACE2, color: TEXT, border: `1px solid ${BORDER}`, fontSize: '0.85rem', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.78rem', color: TEXT2, fontWeight: '600' }}>Role</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                style={{ padding: '10px 12px', borderRadius: '8px', background: SURFACE2, color: TEXT, border: `1px solid ${BORDER}`, fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}>
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" disabled={createMutation.isPending || updateMutation.isPending}
              style={{ padding: '10px 20px', borderRadius: '8px', background: ACCENT, color: '#fff', border: 'none', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}>
              {editUser ? 'Save Changes' : 'Create User'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditUser(null); resetForm(); }}
              style={{ padding: '10px 20px', borderRadius: '8px', background: SURFACE2, color: TEXT2, border: `1px solid ${BORDER}`, fontSize: '0.85rem', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div style={{ color: TEXT3, padding: '40px', textAlign: 'center' }}>Loading...</div>
      ) : users.length === 0 ? (
        <div style={{ color: TEXT3, padding: '40px', textAlign: 'center' }}>No admin users found.</div>
      ) : (
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: '16px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}`, background: SURFACE2 }}>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Username</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Last Login</th>
                <th style={thStyle}>Created</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={tdStyle}>{u.id}</td>
                  <td style={{ ...tdStyle, fontWeight: '600', color: TEXT }}>{u.username}</td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '700',
                      background: u.role === 'super_admin' ? 'rgba(99,102,241,0.1)' : 'rgba(59,130,246,0.1)',
                      color: u.role === 'super_admin' ? '#818cf8' : '#60a5fa',
                    }}>{u.role}</span>
                  </td>
                  <td style={tdStyle}>{u.last_login ? new Date(u.last_login).toLocaleString() : '\u2014'}</td>
                  <td style={tdStyle}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button type="button" onClick={() => openEdit(u)}
                        style={actionBtn}>Edit</button>
                      <button type="button" onClick={() => { if (confirm(`Delete user "${u.username}"?`)) deleteMutation.mutate(u.id); }}
                        disabled={deleteMutation.isPending}
                        style={{ ...actionBtn, color: '#f87171' }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const thStyle = {
  padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: '700',
  color: TEXT3, textTransform: 'uppercase', letterSpacing: '0.06em',
};

const tdStyle = {
  padding: '14px 16px', color: TEXT2, fontSize: '0.85rem',
};

const actionBtn = {
  padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700',
  cursor: 'pointer', background: SURFACE2, color: '#60a5fa',
  border: `1px solid ${BORDER}`,
};
