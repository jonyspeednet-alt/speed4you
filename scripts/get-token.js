const jwt = require('/home/speed4you/portal-app/backend/node_modules/jsonwebtoken');
const token = jwt.sign(
  { id: 1, username: 'admin', role: 'super_admin' },
  '***REMOVED***',
  { expiresIn: '24h' }
);
console.log(token);
