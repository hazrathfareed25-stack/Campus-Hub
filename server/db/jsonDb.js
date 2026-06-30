const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function filePath(collection) {
  return path.join(DATA_DIR, `${collection}.json`);
}

function readAll(collection) {
  const fp = filePath(collection);
  if (!fs.existsSync(fp)) {
    fs.writeFileSync(fp, '[]');
    return [];
  }
  const raw = fs.readFileSync(fp, 'utf-8');
  try {
    return JSON.parse(raw || '[]');
  } catch {
    return [];
  }
}

function writeAll(collection, data) {
  fs.writeFileSync(filePath(collection), JSON.stringify(data, null, 2));
}

function insert(collection, doc) {
  const all = readAll(collection);
  all.push(doc);
  writeAll(collection, all);
  return doc;
}

function findOne(collection, predicate) {
  return readAll(collection).find(predicate) || null;
}

function find(collection, predicate = () => true) {
  return readAll(collection).filter(predicate);
}

function updateOne(collection, predicate, updateFn) {
  const all = readAll(collection);
  const idx = all.findIndex(predicate);
  if (idx === -1) return null;
  all[idx] = updateFn(all[idx]);
  writeAll(collection, all);
  return all[idx];
}

function deleteOne(collection, predicate) {
  const all = readAll(collection);
  const idx = all.findIndex(predicate);
  if (idx === -1) return false;
  all.splice(idx, 1);
  writeAll(collection, all);
  return true;
}

module.exports = { readAll, writeAll, insert, findOne, find, updateOne, deleteOne };
