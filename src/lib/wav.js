// Turning a voice recording into a small WAV file that every browser can play
// (Safari, Chrome and Firefox record in different formats, but all of them play WAV).

/** Mix the channels of an AudioBuffer-like object down to one. */
export function toMono(buffer) {
  const n = buffer.numberOfChannels
  const out = new Float32Array(buffer.length)
  for (let c = 0; c < n; c++) {
    const data = buffer.getChannelData(c)
    for (let i = 0; i < out.length; i++) out[i] += data[i] / n
  }
  return out
}

/** Cut the quiet before and after the speaking, leaving a little padding. */
export function trimSilence(samples, sampleRate, { threshold = 0.02, pad = 0.12 } = {}) {
  let start = samples.findIndex((s) => Math.abs(s) > threshold)
  if (start === -1) return samples.subarray(0, 0)
  let end = samples.length - 1
  while (end > start && Math.abs(samples[end]) <= threshold) end--
  const p = Math.round(pad * sampleRate)
  start = Math.max(0, start - p)
  end = Math.min(samples.length, end + p + 1)
  return samples.subarray(start, end)
}

/** 16-bit mono PCM WAV. */
export function encodeWav(samples, sampleRate) {
  const buf = new ArrayBuffer(44 + samples.length * 2)
  const v = new DataView(buf)
  const str = (o, s) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)))
  str(0, 'RIFF')
  v.setUint32(4, 36 + samples.length * 2, true)
  str(8, 'WAVE')
  str(12, 'fmt ')
  v.setUint32(16, 16, true) // fmt chunk size
  v.setUint16(20, 1, true) // PCM
  v.setUint16(22, 1, true) // mono
  v.setUint32(24, sampleRate, true)
  v.setUint32(28, sampleRate * 2, true) // bytes per second
  v.setUint16(32, 2, true) // bytes per frame
  v.setUint16(34, 16, true) // bits per sample
  str(36, 'data')
  v.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return buf
}
