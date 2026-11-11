function channels(hex: string) {
  const match = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex);
  if (!match?.[1]) {
    throw new Error(`Not a #rrggbb colour: ${hex}`);
  }
  const value = match[1];
  const [r = 0, g = 0, b = 0] = [0, 2, 4].map((start) =>
    parseInt(value.slice(start, start + 2), 16),
  );
  const alpha = match[2] === undefined ? 1 : parseInt(match[2], 16) / 255;
  return { r, g, b, alpha };
}

function luminance(hex: string) {
  const { r, g, b } = channels(hex);
  const [lr = 0, lg = 0, lb = 0] = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

export function contrastRatio(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

export function blend(over: string, under: string) {
  const top = channels(over);
  const bottom = channels(under);
  const mix = (a: number, b: number) =>
    Math.round(a * top.alpha + b * (1 - top.alpha))
      .toString(16)
      .padStart(2, "0");
  return `#${mix(top.r, bottom.r)}${mix(top.g, bottom.g)}${mix(top.b, bottom.b)}`;
}
