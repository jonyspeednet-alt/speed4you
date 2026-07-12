const bcrypt = require('bcryptjs');
const {
  listAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
} = require('../data/store/admin');

async function listUsers() {
  return listAdminUsers();
}

async function createUser(username, password, role) {
  if (!username || username.length < 2) {
    const err = new Error('Username must be at least 2 characters');
    err.statusCode = 400;
    throw err;
  }
  if (!password || password.length < 4) {
    const err = new Error('Password must be at least 4 characters');
    err.statusCode = 400;
    throw err;
  }
  if (role && !['admin', 'super_admin'].includes(role)) {
    const err = new Error('Role must be admin or super_admin');
    err.statusCode = 400;
    throw err;
  }
  const validRoles = ['admin', 'super_admin'];
  const finalRole = validRoles.includes(role) ? role : 'admin';
  const passwordHash = await bcrypt.hash(password, 10);
  return createAdminUser(username, passwordHash, finalRole);
}

async function updateUser(id, updates) {
  const fields = {};
  if (updates.username !== undefined) {
    if (String(updates.username).trim().length < 2) {
      const err = new Error('Username must be at least 2 characters');
      err.statusCode = 400;
      throw err;
    }
    fields.username = updates.username;
  }
  if (updates.password !== undefined) {
    if (updates.password.length < 4) {
      const err = new Error('Password must be at least 4 characters');
      err.statusCode = 400;
      throw err;
    }
    fields.password_hash = await bcrypt.hash(updates.password, 10);
  }
  if (updates.role !== undefined) {
    if (!['admin', 'super_admin'].includes(updates.role)) {
      const err = new Error('Role must be admin or super_admin');
      err.statusCode = 400;
      throw err;
    }
    fields.role = updates.role;
  }
  const result = await updateAdminUser(Number(id), fields);
  if (!result) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  return result;
}

async function deleteUser(id) {
  const ok = await deleteAdminUser(Number(id));
  if (!ok) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  return { deleted: true };
}

module.exports = { listUsers, createUser, updateUser, deleteUser };
