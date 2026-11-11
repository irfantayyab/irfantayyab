function ascii(bytes: Uint8Array, offset: number, text: string) {
  for (const [i, char] of [...text].entries()) {
    bytes[offset + i] = char.charCodeAt(0);
  }
}

function uint(bytes: Uint8Array, offset: number, value: number, size: number) {
  for (let i = 0; i < size; i++) {
    bytes[offset + i] = (value >> (8 * i)) & 0xff;
  }
}

export function webpHeader(width: number, height: number, byteLength = 30) {
  const bytes = new Uint8Array(Math.max(30, byteLength));
  ascii(bytes, 0, "RIFF");
  uint(bytes, 4, bytes.length - 8, 4);
  ascii(bytes, 8, "WEBP");
  ascii(bytes, 12, "VP8X");
  uint(bytes, 16, 10, 4);
  uint(bytes, 24, width - 1, 3);
  uint(bytes, 27, height - 1, 3);
  return bytes;
}
