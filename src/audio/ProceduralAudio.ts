import { Howl } from 'howler';

function encodeWav(samples: Float32Array, sampleRate: number): string {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped * 0x7fff, true);
    offset += 2;
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

function generateSamples(
  duration: number,
  sampleRate: number,
  fn: (t: number, i: number) => number,
): Float32Array {
  const length = Math.max(1, Math.floor(duration * sampleRate));
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    samples[i] = fn(i / sampleRate, i);
  }
  return samples;
}

function inferPreset(path: string): 'gunshot' | 'engine' | 'footstep' | 'explosion' | 'tone' {
  const lower = path.toLowerCase();
  if (lower.includes('gunshot') || lower.includes('shoot')) return 'gunshot';
  if (lower.includes('engine')) return 'engine';
  if (lower.includes('footstep')) return 'footstep';
  if (lower.includes('explosion') || lower.includes('crash')) return 'explosion';
  return 'tone';
}

export class ProceduralAudio {
  static createTone(frequency: number, duration: number, type: OscillatorType = 'sine'): Howl {
    const sampleRate = 22050;
    const samples = generateSamples(duration, sampleRate, (t) => {
      const envelope = Math.exp(-t * 6);
      const phase = 2 * Math.PI * frequency * t;
      switch (type) {
        case 'square':
          return Math.sign(Math.sin(phase)) * envelope * 0.35;
        case 'sawtooth':
          return ((2 * ((frequency * t) % 1)) - 1) * envelope * 0.3;
        case 'triangle':
          return (2 * Math.abs(2 * ((frequency * t) % 1) - 1) - 1) * envelope * 0.35;
        default:
          return Math.sin(phase) * envelope * 0.4;
      }
    });
    const src = encodeWav(samples, sampleRate);
    return new Howl({ src: [src], format: ['wav'] });
  }

  static createForPath(path: string): Howl {
    const preset = inferPreset(path);
    switch (preset) {
      case 'gunshot':
        return ProceduralAudio.createGunshot();
      case 'engine':
        return ProceduralAudio.createEngineIdle();
      case 'footstep':
        return ProceduralAudio.createFootstep();
      case 'explosion':
        return ProceduralAudio.createExplosion();
      default:
        return ProceduralAudio.createTone(220, 0.25, 'sine');
    }
  }

  static createGunshot(): Howl {
    const sampleRate = 22050;
    const samples = generateSamples(0.12, sampleRate, () => (Math.random() * 2 - 1) * 0.8);
    const src = encodeWav(samples, sampleRate);
    return new Howl({ src: [src], format: ['wav'] });
  }

  static createFootstep(): Howl {
    const sampleRate = 22050;
    const samples = generateSamples(0.08, sampleRate, (t) => {
      const thud = Math.sin(2 * Math.PI * 80 * t) * Math.exp(-t * 40);
      const noise = (Math.random() * 2 - 1) * 0.15 * Math.exp(-t * 30);
      return thud + noise;
    });
    const src = encodeWav(samples, sampleRate);
    return new Howl({ src: [src], format: ['wav'] });
  }

  static createEngineIdle(): Howl {
    const sampleRate = 22050;
    const samples = generateSamples(1.5, sampleRate, (t) => {
      const rumble = Math.sin(2 * Math.PI * 55 * t) * 0.25;
      const harmonic = Math.sin(2 * Math.PI * 110 * t) * 0.1;
      const wobble = Math.sin(2 * Math.PI * 3 * t) * 0.05;
      return rumble + harmonic + wobble;
    });
    const src = encodeWav(samples, sampleRate);
    return new Howl({ src: [src], format: ['wav'], loop: true });
  }

  static createExplosion(): Howl {
    const sampleRate = 22050;
    const samples = generateSamples(0.6, sampleRate, (t) => {
      const noise = (Math.random() * 2 - 1) * Math.exp(-t * 4);
      const sweep = Math.sin(2 * Math.PI * (200 - t * 250) * t) * Math.exp(-t * 3);
      return (noise * 0.6 + sweep * 0.4) * 0.7;
    });
    const src = encodeWav(samples, sampleRate);
    return new Howl({ src: [src], format: ['wav'] });
  }
}
