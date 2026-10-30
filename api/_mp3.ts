// Minimal MP3 frame reading, used to join narration chunks cleanly and to
// work out their length without decoding the audio.

const BITRATES_V1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
const BITRATES_V2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]
const SAMPLE_RATES: Record<number, number[]> = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] }

interface Frame {
  offset: number
  size: number
  samples: number
  sampleRate: number
  // Xing/Info frames carry header data for the whole file, not audio.
  isInfo: boolean
}

function readFrames(data: Buffer): Frame[] {
  let offset = 0
  if (data.subarray(0, 3).toString('latin1') === 'ID3' && data.length >= 10) {
    offset = 10 + ((data[6] << 21) | (data[7] << 14) | (data[8] << 7) | data[9])
  }

  const frames: Frame[] = []
  while (offset + 4 <= data.length) {
    const header = data.readUInt32BE(offset)
    const version = (header >>> 19) & 3
    const layer = (header >>> 17) & 3
    const bitrateIndex = (header >>> 12) & 15
    const sampleRateIndex = (header >>> 10) & 3
    const valid = (header >>> 21) === 0x7ff && version !== 1 && layer === 1
      && bitrateIndex !== 0 && bitrateIndex !== 15 && sampleRateIndex !== 3
    if (!valid) {
      offset++
      continue
    }

    const isV1 = version === 3
    const sampleRate = SAMPLE_RATES[version][sampleRateIndex]
    const bitrate = (isV1 ? BITRATES_V1 : BITRATES_V2)[bitrateIndex] * 1000
    const size = Math.floor(((isV1 ? 144 : 72) * bitrate) / sampleRate) + ((header >>> 9) & 1)
    const head = data.subarray(offset, offset + Math.min(size, 64)).toString('latin1')
    frames.push({
      offset,
      size,
      samples: isV1 ? 1152 : 576,
      sampleRate,
      isInfo: head.includes('Xing') || head.includes('Info'),
    })
    offset += size
  }
  return frames
}

// Joins MP3 files into one, dropping per-file ID3 tags and Xing/Info frames so
// players work out the duration of the whole file, not just the first part.
export function joinMp3(parts: Buffer[]): Buffer {
  const audio: Buffer[] = []
  for (const part of parts) {
    for (const frame of readFrames(part)) {
      if (!frame.isInfo) audio.push(part.subarray(frame.offset, frame.offset + frame.size))
    }
  }
  return Buffer.concat(audio)
}

export function mp3Duration(data: Buffer): number {
  const seconds = readFrames(data)
    .filter(frame => !frame.isInfo)
    .reduce((total, frame) => total + frame.samples / frame.sampleRate, 0)
  return Math.round(seconds * 10) / 10
}
