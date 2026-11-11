import { inflateSync } from "node:zlib";

function view(bytes: Uint8Array) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function cmapTable(woff: Uint8Array) {
  const data = view(woff);
  if (data.getUint32(0) !== 0x774f4646) {
    throw new Error("Not a WOFF file");
  }
  const tables = data.getUint16(12);
  for (let i = 0; i < tables; i++) {
    const entry = 44 + i * 20;
    if (data.getUint32(entry) !== 0x636d6170) {
      continue;
    }
    const offset = data.getUint32(entry + 4);
    const compressed = data.getUint32(entry + 8);
    const length = data.getUint32(entry + 12);
    const table = woff.subarray(offset, offset + compressed);
    return compressed < length ? new Uint8Array(inflateSync(table)) : table;
  }
  throw new Error("The WOFF file has no cmap table");
}

function format4(data: DataView, start: number, glyphs: Set<number>) {
  const segments = data.getUint16(start + 6) / 2;
  const ends = start + 14;
  const starts = ends + segments * 2 + 2;
  const deltas = starts + segments * 2;
  const ranges = deltas + segments * 2;
  for (let s = 0; s < segments; s++) {
    const first = data.getUint16(starts + s * 2);
    const last = data.getUint16(ends + s * 2);
    const delta = data.getUint16(deltas + s * 2);
    const rangeAt = ranges + s * 2;
    const range = data.getUint16(rangeAt);
    for (let code = first; code <= last && code !== 0xffff; code++) {
      let glyph = 0;
      if (range === 0) {
        glyph = (code + delta) & 0xffff;
      } else {
        const raw = data.getUint16(rangeAt + range + (code - first) * 2);
        glyph = raw === 0 ? 0 : (raw + delta) & 0xffff;
      }
      if (glyph !== 0) {
        glyphs.add(code);
      }
    }
  }
}

function format12(data: DataView, start: number, glyphs: Set<number>) {
  const groups = data.getUint32(start + 12);
  for (let g = 0; g < groups; g++) {
    const group = start + 16 + g * 12;
    const first = data.getUint32(group);
    const last = data.getUint32(group + 4);
    const firstGlyph = data.getUint32(group + 8);
    for (let code = first; code <= last; code++) {
      if (firstGlyph + (code - first) !== 0) {
        glyphs.add(code);
      }
    }
  }
}

function isUnicode(platform: number, encoding: number) {
  return (
    (platform === 3 && [0, 1, 10].includes(encoding)) ||
    (platform === 0 && encoding <= 4)
  );
}

function subtableOffset(data: DataView) {
  for (let r = data.getUint16(2) - 1; r >= 0; r--) {
    const record = 4 + r * 8;
    if (isUnicode(data.getUint16(record), data.getUint16(record + 2))) {
      return data.getUint32(record + 4);
    }
  }
  throw new Error("The WOFF file has no Unicode cmap subtable");
}

export function woffCodePoints(woff: Uint8Array) {
  const data = view(cmapTable(woff));
  const glyphs = new Set<number>();
  const start = subtableOffset(data);
  const format = data.getUint16(start);
  if (format === 4) {
    format4(data, start, glyphs);
  } else if (format === 12) {
    format12(data, start, glyphs);
  } else {
    throw new Error(`The WOFF file's cmap subtable is format ${format}`);
  }
  return glyphs;
}
