import { describe, expect, it } from 'vitest'
import { encodeWav, toMono, trimSilence } from '../src/lib/wav.js'

describe('recordings as WAV', () => {
  it('writes a playable 16-bit mono WAV header', () => {
    const buf = encodeWav(new Float32Array([0, 0.5, -0.5, 1]), 48000)
    const v = new DataView(buf)
    const text = (o, n) => String.fromCharCode(...new Uint8Array(buf, o, n))
    expect(text(0, 4)).toBe('RIFF')
    expect(text(8, 4)).toBe('WAVE')
    expect(v.getUint16(22, true)).toBe(1)
    expect(v.getUint32(24, true)).toBe(48000)
    expect(v.getUint32(40, true)).toBe(8)
    expect(v.getInt16(44 + 6, true)).toBe(0x7fff)
  })

  it('cuts the quiet before and after the speaking', () => {
    const rate = 100
    const s = new Float32Array(300)
    s.fill(0.5, 100, 200)
    const t = trimSilence(s, rate, { pad: 0.1 })
    expect(t.length).toBe(120)
    expect(trimSilence(new Float32Array(50), rate).length).toBe(0)
  })

  it('mixes stereo to mono', () => {
    const ch = [new Float32Array([1, 0]), new Float32Array([0, 1])]
    const mono = toMono({ numberOfChannels: 2, length: 2, getChannelData: (i) => ch[i] })
    expect([...mono]).toEqual([0.5, 0.5])
  })
})
