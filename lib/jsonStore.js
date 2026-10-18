'use strict';
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');

// A tiny JSON-file store. Writes are queued one at a time and written atomically
// (temp file, then rename) so a crash never leaves a half-written file.
// A real database is better for production with many users (see README).
function createStore(file, key) {
  let queue = Promise.resolve();

  async function read() {
    try {
      const data = JSON.parse(await fsp.readFile(file, 'utf8'));
      return Array.isArray(data[key]) ? data[key] : [];
    } catch (err) {
      if (err.code === 'ENOENT') return [];
      throw err;
    }
  }

  async function write(list) {
    await fsp.mkdir(DATA_DIR, { recursive: true });
    const tmp = `${file}.${crypto.randomBytes(6).toString('hex')}.tmp`;
    await fsp.writeFile(tmp, JSON.stringify({ [key]: list }, null, 2), 'utf8');
    await fsp.rename(tmp, file);
  }

  // mutator receives the current array and changes it in place (push, splice, assign).
  // If the mutator throws, nothing is written.
  function update(mutator) {
    const run = queue.then(async () => {
      const list = await read();
      const result = await mutator(list);
      await write(list);
      return result;
    });
    queue = run.catch(() => {});
    return run;
  }

  return { read, update };
}

module.exports = {
  createStore,
  products: createStore(path.join(DATA_DIR, 'products.json'), 'products'),
  orders: createStore(path.join(DATA_DIR, 'orders.json'), 'orders'),
  subscribers: createStore(path.join(DATA_DIR, 'subscribers.json'), 'subscribers')
};
