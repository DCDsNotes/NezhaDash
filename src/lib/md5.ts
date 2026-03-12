// Minimal MD5 implementation (RFC 1321) for browser use.
// Returns lowercase hex string.

function toUtf8Bytes(input: string): Uint8Array {
  return new TextEncoder().encode(input)
}

function toHexLE(words: number[]): string {
  let out = ""
  for (let i = 0; i < words.length; i++) {
    const w = words[i] >>> 0
    out += (w & 0xff).toString(16).padStart(2, "0")
    out += ((w >>> 8) & 0xff).toString(16).padStart(2, "0")
    out += ((w >>> 16) & 0xff).toString(16).padStart(2, "0")
    out += ((w >>> 24) & 0xff).toString(16).padStart(2, "0")
  }
  return out
}

function rotl(x: number, n: number) {
  return ((x << n) | (x >>> (32 - n))) >>> 0
}

function add32(a: number, b: number) {
  return (a + b) >>> 0
}

function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
  return add32(rotl(add32(add32(a, q), add32(x, t)), s), b)
}

function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
  return cmn((b & c) | (~b & d), a, b, x, s, t)
}

function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
  return cmn((b & d) | (c & ~d), a, b, x, s, t)
}

function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
  return cmn(b ^ c ^ d, a, b, x, s, t)
}

function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
  return cmn(c ^ (b | ~d), a, b, x, s, t)
}

function bytesToWordsLE(bytes: Uint8Array): number[] {
  const words: number[] = []
  for (let i = 0; i < bytes.length; i++) {
    words[i >>> 2] = (words[i >>> 2] || 0) | (bytes[i] << ((i % 4) * 8))
  }
  return words
}

export function md5(input: string): string {
  const bytes = toUtf8Bytes(input)
  const origBitLen = bytes.length * 8

  // padding: 0x80 then 0x00... until length ≡ 56 (mod 64)
  const padLen = (((56 - (bytes.length + 1)) % 64) + 64) % 64
  const padded = new Uint8Array(bytes.length + 1 + padLen + 8)
  padded.set(bytes, 0)
  padded[bytes.length] = 0x80

  // append length (little-endian 64-bit)
  const view = new DataView(padded.buffer)
  view.setUint32(padded.length - 8, origBitLen >>> 0, true)
  view.setUint32(padded.length - 4, Math.floor(origBitLen / 0x100000000) >>> 0, true)

  const x = bytesToWordsLE(padded)

  let a = 0x67452301
  let b = 0xefcdab89
  let c = 0x98badcfe
  let d = 0x10325476

  for (let i = 0; i < x.length; i += 16) {
    const aa = a
    const bb = b
    const cc = c
    const dd = d

    a = ff(a, b, c, d, x[i + 0], 7, 0xd76aa478)
    d = ff(d, a, b, c, x[i + 1], 12, 0xe8c7b756)
    c = ff(c, d, a, b, x[i + 2], 17, 0x242070db)
    b = ff(b, c, d, a, x[i + 3], 22, 0xc1bdceee)
    a = ff(a, b, c, d, x[i + 4], 7, 0xf57c0faf)
    d = ff(d, a, b, c, x[i + 5], 12, 0x4787c62a)
    c = ff(c, d, a, b, x[i + 6], 17, 0xa8304613)
    b = ff(b, c, d, a, x[i + 7], 22, 0xfd469501)
    a = ff(a, b, c, d, x[i + 8], 7, 0x698098d8)
    d = ff(d, a, b, c, x[i + 9], 12, 0x8b44f7af)
    c = ff(c, d, a, b, x[i + 10], 17, 0xffff5bb1)
    b = ff(b, c, d, a, x[i + 11], 22, 0x895cd7be)
    a = ff(a, b, c, d, x[i + 12], 7, 0x6b901122)
    d = ff(d, a, b, c, x[i + 13], 12, 0xfd987193)
    c = ff(c, d, a, b, x[i + 14], 17, 0xa679438e)
    b = ff(b, c, d, a, x[i + 15], 22, 0x49b40821)

    a = gg(a, b, c, d, x[i + 1], 5, 0xf61e2562)
    d = gg(d, a, b, c, x[i + 6], 9, 0xc040b340)
    c = gg(c, d, a, b, x[i + 11], 14, 0x265e5a51)
    b = gg(b, c, d, a, x[i + 0], 20, 0xe9b6c7aa)
    a = gg(a, b, c, d, x[i + 5], 5, 0xd62f105d)
    d = gg(d, a, b, c, x[i + 10], 9, 0x02441453)
    c = gg(c, d, a, b, x[i + 15], 14, 0xd8a1e681)
    b = gg(b, c, d, a, x[i + 4], 20, 0xe7d3fbc8)
    a = gg(a, b, c, d, x[i + 9], 5, 0x21e1cde6)
    d = gg(d, a, b, c, x[i + 14], 9, 0xc33707d6)
    c = gg(c, d, a, b, x[i + 3], 14, 0xf4d50d87)
    b = gg(b, c, d, a, x[i + 8], 20, 0x455a14ed)
    a = gg(a, b, c, d, x[i + 13], 5, 0xa9e3e905)
    d = gg(d, a, b, c, x[i + 2], 9, 0xfcefa3f8)
    c = gg(c, d, a, b, x[i + 7], 14, 0x676f02d9)
    b = gg(b, c, d, a, x[i + 12], 20, 0x8d2a4c8a)

    a = hh(a, b, c, d, x[i + 5], 4, 0xfffa3942)
    d = hh(d, a, b, c, x[i + 8], 11, 0x8771f681)
    c = hh(c, d, a, b, x[i + 11], 16, 0x6d9d6122)
    b = hh(b, c, d, a, x[i + 14], 23, 0xfde5380c)
    a = hh(a, b, c, d, x[i + 1], 4, 0xa4beea44)
    d = hh(d, a, b, c, x[i + 4], 11, 0x4bdecfa9)
    c = hh(c, d, a, b, x[i + 7], 16, 0xf6bb4b60)
    b = hh(b, c, d, a, x[i + 10], 23, 0xbebfbc70)
    a = hh(a, b, c, d, x[i + 13], 4, 0x289b7ec6)
    d = hh(d, a, b, c, x[i + 0], 11, 0xeaa127fa)
    c = hh(c, d, a, b, x[i + 3], 16, 0xd4ef3085)
    b = hh(b, c, d, a, x[i + 6], 23, 0x04881d05)
    a = hh(a, b, c, d, x[i + 9], 4, 0xd9d4d039)
    d = hh(d, a, b, c, x[i + 12], 11, 0xe6db99e5)
    c = hh(c, d, a, b, x[i + 15], 16, 0x1fa27cf8)
    b = hh(b, c, d, a, x[i + 2], 23, 0xc4ac5665)

    a = ii(a, b, c, d, x[i + 0], 6, 0xf4292244)
    d = ii(d, a, b, c, x[i + 7], 10, 0x432aff97)
    c = ii(c, d, a, b, x[i + 14], 15, 0xab9423a7)
    b = ii(b, c, d, a, x[i + 5], 21, 0xfc93a039)
    a = ii(a, b, c, d, x[i + 12], 6, 0x655b59c3)
    d = ii(d, a, b, c, x[i + 3], 10, 0x8f0ccc92)
    c = ii(c, d, a, b, x[i + 10], 15, 0xffeff47d)
    b = ii(b, c, d, a, x[i + 1], 21, 0x85845dd1)
    a = ii(a, b, c, d, x[i + 8], 6, 0x6fa87e4f)
    d = ii(d, a, b, c, x[i + 15], 10, 0xfe2ce6e0)
    c = ii(c, d, a, b, x[i + 6], 15, 0xa3014314)
    b = ii(b, c, d, a, x[i + 13], 21, 0x4e0811a1)
    a = ii(a, b, c, d, x[i + 4], 6, 0xf7537e82)
    d = ii(d, a, b, c, x[i + 11], 10, 0xbd3af235)
    c = ii(c, d, a, b, x[i + 2], 15, 0x2ad7d2bb)
    b = ii(b, c, d, a, x[i + 9], 21, 0xeb86d391)

    a = add32(a, aa)
    b = add32(b, bb)
    c = add32(c, cc)
    d = add32(d, dd)
  }

  return toHexLE([a, b, c, d])
}

export function md5_8(input: string): string {
  return md5(input).slice(0, 8)
}

