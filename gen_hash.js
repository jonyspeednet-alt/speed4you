const bcrypt = require('/home/speed4you/portal-app/backend/node_modules/bcryptjs');
const hash = bcrypt.hashSync('***REMOVED***', 10);
console.log(hash);
