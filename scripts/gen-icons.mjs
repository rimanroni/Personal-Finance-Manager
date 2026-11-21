import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CRC = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
})();

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(CRC(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function makeIcon(size) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const S = size / 512;
  const teal = [13, 155, 136];
  const deep = [10, 122, 107];
  const white = [255, 255, 255];

  const inRect = (x, y, x1, y1, x2, y2) => x >= x1 * S && x <= x2 * S && y >= y1 * S && y <= y2 * S;
  const inCircle = (x, y, cx, cy, r) => Math.hypot(x - cx * S, y - cy * S) <= r * S;

  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      // rounded-square mask
      const rad = 96 * S;
      const cx = Math.min(Math.max(x, rad), size - rad);
      const cy = Math.min(Math.max(y, rad), size - rad);
      const inside = Math.hypot(x - cx, y - cy) <= rad;
      const p = y * (size * 4 + 1) + 1 + x * 4;
      let color = inside ? teal : [255, 255, 255];
      if (inside) {
        // subtle radial darkening toward edges
        const d = Math.hypot(x - size / 2, y - size / 2) / (size / 2);
        const k = Math.max(0, Math.min(1, d * 0.35));
        color = teal.map((v, i) => Math.round(v * (1 - k) + deep[i] * k));
        // white glyph: vertical stroke + two cross bars (stylized ৳)
        if (inRect(x, y, 236, 132, 276, 386)) color = white;
        if (inRect(x, y, 170, 168, 342, 208)) color = white;
        if (inRect(x, y, 190, 300, 330, 336)) color = white;
        // two short slashes on the lower bar
        for (let s = 0; s < 2; s++) {
          const sx = 214 + s * 58;
          for (let t = 0; t < 30 * S; t++) {
            const px = Math.round(sx * S + t);
            const py = Math.round((336 + t * 0.55) * S);
            if (px >= 0 && px < size && py >= 0 && py < size) {
              const pp = py * (size * 4 + 1) + 1 + px * 4;
              raw[pp] = white[0]; raw[pp + 1] = white[1]; raw[pp + 2] = white[2]; raw[pp + 3] = 255;
            }
          }
        }
      }
      raw[p] = color[0]; raw[p + 1] = color[1]; raw[p + 2] = color[2]; raw[p + 3] = inside ? 255 : 0;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const dir = join(process.cwd(), 'public', 'icons');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'icon-192.png'), makeIcon(192));
writeFileSync(join(dir, 'icon-512.png'), makeIcon(512));
console.log('Icons generated:', dir);
