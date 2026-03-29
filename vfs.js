/** @typedef {{ name: string, data: Uint8Array }} VfsEntry */

export const DEADBEEF = 0xdeadbeef;
const DEADBEEF_BYTES = new Uint8Array([
  DEADBEEF & 0xff,
  (DEADBEEF >>> 8) & 0xff,
  (DEADBEEF >>> 16) & 0xff,
  (DEADBEEF >>> 24) & 0xff,
]);

/**
 * @param {Uint8Array} buf
 * @param {number} offset
 */
export function readU32(buf, offset) {
  return (
    buf[offset] |
    (buf[offset + 1] << 8) |
    (buf[offset + 2] << 16) |
    (buf[offset + 3] << 24)
  ) >>> 0;
}

/**
 * @param {Uint8Array} buf
 * @param {number} offset
 * @param {number} value
 */
export function writeU32(buf, offset, value) {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >>> 8) & 0xff;
  buf[offset + 2] = (value >>> 16) & 0xff;
  buf[offset + 3] = (value >>> 24) & 0xff;
}

function bytesEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function hexSlice(buf, start, end) {
  let s = "";
  for (let i = start; i < end && i < buf.length; i++) {
    s += buf[i].toString(16).padStart(2, "0");
  }
  return s;
}

/**
 * @param {ArrayBuffer | Uint8Array} raw
 * @returns {VfsEntry[]}
 */
export function parseVfs(raw) {
  const u8 = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
  /** @type {VfsEntry[]} */
  const entries = [];
  let p = 0;
  const len = u8.length;
  while (p + 4 <= len) {
    if (readU32(u8, p) === DEADBEEF) break;
    const nameLen = readU32(u8, p);
    p += 4;
    const nameBytes = u8.subarray(p, p + nameLen);
    p += nameLen;
    const decoder = new TextDecoder("utf-8", { fatal: true });
    const name = decoder.decode(nameBytes);
    const dataLen = readU32(u8, p);
    p += 4;
    const data = new Uint8Array(u8.subarray(p, p + dataLen));
    p += dataLen;
    entries.push({ name, data });
  }
  const tail = u8.subarray(p, p + 4);
  if (!bytesEqual(tail, DEADBEEF_BYTES)) {
    throw new Error(
      `VFS does not end with 0xDEADBEEF (got ${hexSlice(u8, p, p + 4)})`
    );
  }
  return entries;
}

/**
 * @param {VfsEntry[]} entries
 * @returns {Uint8Array}
 */
export function rebuildVfs(entries) {
  let total = 4;
  for (const e of entries) {
    const nb = new TextEncoder().encode(e.name);
    total += 4 + nb.length + 4 + e.data.length;
  }
  const out = new Uint8Array(total);
  let o = 0;
  const enc = new TextEncoder();
  for (const e of entries) {
    const nameBytes = enc.encode(e.name);
    writeU32(out, o, nameBytes.length);
    o += 4;
    out.set(nameBytes, o);
    o += nameBytes.length;
    writeU32(out, o, e.data.length);
    o += 4;
    out.set(e.data, o);
    o += e.data.length;
  }
  out.set(DEADBEEF_BYTES, o);
  return out;
}

const DATA_BIN_RE = /^data\d{4}\.bin$/;

/**
 * @param {string} name
 */
export function isDataBin(name) {
  return DATA_BIN_RE.test(name);
}

export const Offset = {
  TEXT: 0x31d - 0x14,
  EVENT_ID: 0x354 - 0x14,
  HEADER_CHECKSUM: 0x330 - 0x14,
  VOICE: 0x1d394 - 0x14,
  BODY_CHECKSUM: 0x3aca4 - 0x14,
  HEADER_RANGE: /** @type {const} */ ([0x2f8 - 0x14, 0x330 - 0x14]),
  BODY_RANGE: /** @type {const} */ ([0x334 - 0x14, 0x3aca4 - 0x14]),
  MIN_FILE_SIZE: 0x3aca4 - 0x14 + 4,
};

/**
 * @param {Uint8Array} buf
 * @param {[number, number]} sumRange
 * @param {number} outOffset
 */
export function fixChecksum(buf, sumRange, outOffset) {
  const [start, end] = sumRange;
  let s = 0;
  for (let i = start; i < end; i++) s += buf[i];
  writeU32(buf, outOffset, s >>> 0);
}

/**
 * @param {Uint8Array} buf
 * @returns {[number, number]} [text, voice]
 */
export function getSavefileLangs(buf) {
  const text = buf[Offset.TEXT];
  const voice = buf[Offset.VOICE];
  return [text, voice];
}

/**
 * @param {Uint8Array} buf
 */
export function getEventId(buf) {
  return readU32(buf, Offset.EVENT_ID);
}

/**
 * @param {Uint8Array} buf
 * @param {number} voiceLang
 * @param {number} textLang
 * @param {number | null | undefined} eventId
 */
export function editSavefile(buf, voiceLang, textLang, eventId) {
  buf[Offset.VOICE] = voiceLang;
  buf[Offset.TEXT] = textLang;
  if (eventId !== undefined && eventId !== null) {
    writeU32(buf, Offset.EVENT_ID, eventId);
  }
  fixChecksum(buf, Offset.HEADER_RANGE, Offset.HEADER_CHECKSUM);
  fixChecksum(buf, Offset.BODY_RANGE, Offset.BODY_CHECKSUM);
}
