'use strict';
// Usage: npm run hash-password
// Asks for a password (hidden), then prints values to paste into your .env file.
const readline = require('readline');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
rl.stdoutMuted = false;
rl._writeToOutput = function (text) {
  if (rl.stdoutMuted && !/[\r\n]/.test(text)) rl.output.write('*');
  else rl.output.write(text);
};

rl.question('Enter a new admin password (at least 12 characters): ', async (password) => {
  rl.stdoutMuted = false;
  rl.close();
  console.log('');
  if (password.length < 12) {
    console.error('Password is too short. Use at least 12 characters.');
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 12);
  console.log('Copy these two lines into your .env file:\n');
  console.log(`ADMIN_PASSWORD_HASH='${hash}'`);
  console.log(`SESSION_SECRET=${crypto.randomBytes(48).toString('hex')}\n`);
});
rl.stdoutMuted = true;
