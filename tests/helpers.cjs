const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load(file, mocks = {}, env = {}) {
  const cache = new Map();
  function read(filename) {
    filename = path.resolve(filename);
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const context = { module, exports: module.exports, Buffer, Response, URL, setTimeout,
      process: { env }, require(name) {
        if (Object.hasOwn(mocks, name)) return mocks[name];
        return name.startsWith('.') ? read(path.resolve(path.dirname(filename), name + '.js')) : require(name);
      } };
    vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context, { filename });
    return module.exports;
  }
  return read(file);
}
function response() {
  return { headers: {}, code: 200, setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}
function memoryBlob(initial = {}) {
  const records = new Map(Object.entries(initial).map(([key, data]) => [key, { data, etag: '1' }]));
  let version = 1;
  return {
    records,
    async get(key, options) {
      if (options.useCache !== false) throw Error('Consistent reads required');
      const value = records.get(key);
      return value ? { statusCode: 200, stream: JSON.stringify(value.data), blob: { etag: value.etag } } : null;
    },
    async put(key, json, options) {
      const previous = records.get(key);
      if ((previous && !options.allowOverwrite) || (options.ifMatch && previous?.etag !== options.ifMatch)) {
        const sdk = require('@vercel/blob');
        const error = options.ifMatch ? new sdk.BlobPreconditionFailedError() : new sdk.BlobError('Blob already exists');
        throw error;
      }
      records.set(key, { data: JSON.parse(json), etag: String(++version) });
    },
  };
}
module.exports = { load, response, memoryBlob };
