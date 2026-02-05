/**
 * Synthesized clap generation using OfflineAudioContext.
 * Pre-renders 12 clap buffer variants with varying bandpass filter center frequencies.
 */

import { NUM_CLAP_VARIANTS, SAMPLE_RATE } from './constants.js';

const DURATION = 0.15; // 150ms per clap buffer
const ATTACK_TIME = 0.002; // 2ms attack
const DECAY_TIME = 0.1; // 100ms base decay

// Bandpass center frequencies spread across 2000-5000 Hz
const MIN_FREQ = 2000;
const MAX_FREQ = 5000;

/**
 * Pre-render all clap buffer variants.
 * @returns {Promise<AudioBuffer[]>} Array of 12 pre-rendered clap buffers
 */
export async function synthesizeClapVariants() {
  const variants = [];
  for (let i = 0; i < NUM_CLAP_VARIANTS; i++) {
    const centerFreq = MIN_FREQ + (MAX_FREQ - MIN_FREQ) * (i / (NUM_CLAP_VARIANTS - 1));
    const decayTime = DECAY_TIME + (Math.random() * 0.04 - 0.02); // slight variation 80-120ms
    const buffer = await renderClapBuffer(centerFreq, decayTime);
    variants.push(buffer);
  }
  return variants;
}

/**
 * Render a single clap buffer using OfflineAudioContext.
 * Chain: white noise → bandpass → highpass → gain envelope → output
 */
async function renderClapBuffer(centerFreq, decayTime) {
  const length = Math.ceil(DURATION * SAMPLE_RATE);
  const offline = new OfflineAudioContext(1, length, SAMPLE_RATE);

  // Create white noise buffer
  const noiseBuffer = offline.createBuffer(1, length, SAMPLE_RATE);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    noiseData[i] = Math.random() * 2 - 1;
  }

  // Source node
  const source = offline.createBufferSource();
  source.buffer = noiseBuffer;

  // Bandpass filter
  const bandpass = offline.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = centerFreq;
  bandpass.Q.value = 1.0;

  // High-pass filter to remove muddiness
  const highpass = offline.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 800;
  highpass.Q.value = 0.5;

  // Gain envelope: fast attack, exponential decay
  const envelope = offline.createGain();
  envelope.gain.setValueAtTime(0, 0);
  envelope.gain.linearRampToValueAtTime(1.0, ATTACK_TIME);
  envelope.gain.exponentialRampToValueAtTime(0.001, ATTACK_TIME + decayTime);

  // Connect chain
  source.connect(bandpass);
  bandpass.connect(highpass);
  highpass.connect(envelope);
  envelope.connect(offline.destination);

  source.start(0);

  return offline.startRendering();
}
