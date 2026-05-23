const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('***REMOVED***', 10);
console.log(hash);
