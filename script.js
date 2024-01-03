const crypto = require("crypto");
const password = "password";
const salt = crypto.randomBytes(16);
const hash = crypto.pbkdf2Sync(password, salt, 310000, 32, 'sha256')
console.log(hash);
console.log(salt);