function luminance(hex: string) {
  const match = /^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/i.exec(hex);
  if (!match?.[1]) {
    throw new Error(`Not a #rrggbb colour: ${hex}`);
  }
  const value = match[1];
  const [r = 0, g = 0, b = 0] = [0, 2, 4].map((start) => {
    const channel = parseInt(value.slice(start, start + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}
