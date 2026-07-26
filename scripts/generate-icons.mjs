import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

// --- minimal PNG encoder (RGB8) ---
const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePNG(width, height, rgb) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // colour type: truecolour
  const raw = Buffer.alloc((width * 3 + 1) * height)
  let p = 0
  for (let y = 0; y < height; y++) {
    raw[p++] = 0 // filter: none
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3
      raw[p++] = rgb[i]
      raw[p++] = rgb[i + 1]
      raw[p++] = rgb[i + 2]
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// --- icon artwork ---
const GREEN = [0x4a, 0x7c, 0x3f]
const CREAM = [0xfa, 0xf7, 0xf0]
const PALE = [0xc3, 0xd9, 0xba]

// Signed-distance helpers, evaluated on a supersampled grid so edges are
// smooth without needing a real rasteriser.
const leaf = (x, y, cx, cy, rx, ry, rot) => {
  const dx = x - cx
  const dy = y - cy
  const c = Math.cos(rot)
  const s = Math.sin(rot)
  const u = (dx * c + dy * s) / rx
  const v = (-dx * s + dy * c) / ry
  return u * u + v * v <= 1
}

function sample(x, y) {
  // Unit space: 0..1 across the icon.
  // Rounded-square background.
  const r = 0.22
  const inX = Math.min(x, 1 - x)
  const inY = Math.min(y, 1 - y)
  let inside = true
  if (inX < r && inY < r) {
    const dx = r - inX
    const dy = r - inY
    inside = dx * dx + dy * dy <= r * r
  }
  if (!inside) return null // transparent-ish → rendered as page bg

  // Stem
  if (Math.abs(x - 0.5) < 0.031 && y > 0.4 && y < 0.79) return CREAM
  // Rounded stem cap
  if ((x - 0.5) ** 2 + (y - 0.79) ** 2 < 0.031 ** 2) return CREAM

  // Left leaf (cream), right leaf (pale) — a sprout.
  if (leaf(x, y, 0.395, 0.5, 0.165, 0.079, -0.6)) return CREAM
  if (leaf(x, y, 0.605, 0.405, 0.165, 0.079, 0.6)) return PALE

  return GREEN
}

function render(size) {
  const SS = 4 // supersample factor
  const rgb = Buffer.alloc(size * size * 3)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      let n = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size
          const v = (y + (sy + 0.5) / SS) / size
          const c = sample(u, v) ?? CREAM // outside the rounded square
          r += c[0]
          g += c[1]
          b += c[2]
          n++
        }
      }
      const i = (y * size + x) * 3
      rgb[i] = Math.round(r / n)
      rgb[i + 1] = Math.round(g / n)
      rgb[i + 2] = Math.round(b / n)
    }
  }
  return encodePNG(size, size, rgb)
}

const out = process.argv[2]
for (const size of [192, 512]) {
  writeFileSync(`${out}/icon-${size}.png`, render(size))
  console.log(`wrote icon-${size}.png`)
}
