import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  parseVfs,
  rebuildVfs,
  isDataBin,
  getSavefileLangs,
  getEventId,
  editSavefile,
  readU32,
  Offset,
} from "./vfs.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(__dirname, "fixtures");

const EXPECTED_NAMES = [
  "data0000.bin",
  "data0001.bin",
  "data0002.bin",
  "data0003.bin",
  "data0006.bin",
  "data0010.bin",
  "data0011.bin",
  "data0012.bin",
  "data0013.bin",
  "data0015.bin",
  "data0017.bin",
  "data0019.bin",
  "data0026.bin",
  "data0027.bin",
  "data0028.bin",
  "data0029.bin",
  "icon0001.png",
  "icon0010.png",
  "icon0011.png",
  "icon0012.png",
  "icon0013.png",
  "icon0015.png",
  "icon0017.png",
  "icon0019.png",
  "icon0026.png",
  "icon0027.png",
  "icon0028.png",
  "icon0029.png",
];

function loadFixture(name) {
  return new Uint8Array(readFileSync(join(FIXTURES, name)));
}

function u8Equal(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function sumRange(buf, start, end) {
  let s = 0;
  for (let i = start; i < end; i++) s += buf[i];
  return s >>> 0;
}

test("parseVfs speedrun.vfs entry names", () => {
  const raw = loadFixture("speedrun.vfs");
  const entries = parseVfs(raw);
  assert.deepEqual(
    entries.map((e) => e.name),
    EXPECTED_NAMES
  );
});

test("isDataBin classifies data vs icon", () => {
  const dataNames = EXPECTED_NAMES.filter((n) => isDataBin(n));
  const iconNames = EXPECTED_NAMES.filter((n) => !isDataBin(n));
  assert.ok(dataNames.every((n) => n.startsWith("data")));
  assert.ok(iconNames.every((n) => n.startsWith("icon")));
  assert.equal(dataNames.length, 16);
  assert.equal(iconNames.length, 12);
});

test("parseVfs savedata_jp_no_deadbeef.vfs throws", () => {
  const raw = loadFixture("savedata_jp_no_deadbeef.vfs");
  assert.throws(
    () => parseVfs(raw),
    (err) => err instanceof Error && /DEADBEEF/.test(err.message)
  );
});

test("parseVfs savedata_jp.vfs has data bins", () => {
  const raw = loadFixture("savedata_jp.vfs");
  const entries = parseVfs(raw);
  const dataEntries = entries.filter((e) => isDataBin(e.name));
  assert.ok(dataEntries.length > 0);
});

test("getSavefileLangs on savedata_jp first data bin", () => {
  const raw = loadFixture("savedata_jp.vfs");
  const entries = parseVfs(raw);
  const dataEntries = entries.filter((e) => isDataBin(e.name));
  assert.ok(dataEntries.length > 0);
  const entry = dataEntries[0];
  const [text, voice] = getSavefileLangs(entry.data);
  assert.equal(voice, 0, `${entry.name}: voice`);
  assert.equal(text, 1, `${entry.name}: text`);
});

test("rebuildVfs round-trip equals input (speedrun)", () => {
  const raw = loadFixture("speedrun.vfs");
  const entries = parseVfs(raw);
  const out = rebuildVfs(entries);
  assert.ok(u8Equal(raw, out), "round-trip bytes must match");
});

test("rebuildVfs round-trip equals input (savedata_jp)", () => {
  const raw = loadFixture("savedata_jp.vfs");
  const entries = parseVfs(raw);
  const out = rebuildVfs(entries);
  assert.ok(u8Equal(raw, out));
});

test("editSavefile updates langs and checksums", () => {
  const raw = loadFixture("savedata_jp.vfs");
  const entries = parseVfs(raw);
  const dataEntry = entries.find((e) => isDataBin(e.name));
  assert.ok(dataEntry);
  const buf = dataEntry.data;
  const origVoice = buf[Offset.VOICE];
  const origText = buf[Offset.TEXT];
  const origEid = getEventId(buf);

  const newVoice = origVoice === 0 ? 1 : 0;
  const newText = origText === 0 ? 1 : 0;
  editSavefile(buf, newVoice, newText, origEid);

  const [t, v] = getSavefileLangs(buf);
  assert.equal(v, newVoice);
  assert.equal(t, newText);
  assert.equal(getEventId(buf), origEid);

  assert.equal(
    readU32(buf, Offset.HEADER_CHECKSUM),
    sumRange(buf, Offset.HEADER_RANGE[0], Offset.HEADER_RANGE[1])
  );
  assert.equal(
    readU32(buf, Offset.BODY_CHECKSUM),
    sumRange(buf, Offset.BODY_RANGE[0], Offset.BODY_RANGE[1])
  );

  editSavefile(buf, origVoice, origText, origEid);
  const [t2, v2] = getSavefileLangs(buf);
  assert.equal(v2, origVoice);
  assert.equal(t2, origText);
});

test("checksum fields match range sums on valid save (savedata_jp)", () => {
  const raw = loadFixture("savedata_jp.vfs");
  const entries = parseVfs(raw);
  const buf = entries.find((e) => isDataBin(e.name)).data;
  assert.equal(
    readU32(buf, Offset.HEADER_CHECKSUM),
    sumRange(buf, Offset.HEADER_RANGE[0], Offset.HEADER_RANGE[1])
  );
  assert.equal(
    readU32(buf, Offset.BODY_CHECKSUM),
    sumRange(buf, Offset.BODY_RANGE[0], Offset.BODY_RANGE[1])
  );
});
