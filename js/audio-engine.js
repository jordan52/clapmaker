/**
 * Web Audio scheduling engine.
 * Implements the lookahead pattern for precise beat timing,
 * per-person clap characteristics, and LOD for large crowds.
 */

import { LOOKAHEAD_MS, SCHEDULE_INTERVAL_MS, LOD_CLAPPER_THRESHOLD, LOD_SAMPLE_COUNT, CC0_SAMPLE_BASE64, FOOTSTOMP_BASE64 } from './constants.js';
import { sampleOffset } from './distributions.js';
import { synthesizeClapVariants } from './synthesizer.js';

export class AudioEngine {
  constructor() {
    this.audioCtx = null;
    this.masterGain = null;
    this.schedulerTimer = null;

    // Pre-rendered clap variants from synthesizer
    this.clapVariants = null;
    // Decoded CC0 sample buffer
    this.sampleBuffer = null;
    // Decoded foot stomp sample buffer
    this.footstompBuffer = null;
    // User-uploaded custom buffer
    this.customBuffer = null;

    // Per-person characteristics: { variantIndex, pitchFactor, volumeFactor }
    this.persons = [];

    // Scheduling state
    this.nextBeatTime = 0;
    this.currentBeat = 0;

    // Shared event log for visualization
    this.clapEvents = [];
    this.maxEvents = 5000;

    // State reference (set by main.js)
    this.state = null;
  }

  /**
   * Create the AudioContext synchronously (must be called from a user gesture).
   */
  createContext() {
    if (this.audioCtx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = new Ctx();
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.connect(this.audioCtx.destination);
  }

  /**
   * Decode audio data using callback API (Safari compatibility).
   */
  decodeAudio(arrayBuffer) {
    return new Promise((resolve, reject) => {
      this.audioCtx.decodeAudioData(arrayBuffer, resolve, reject);
    });
  }

  /**
   * Load and decode all sound assets (context must already exist).
   */
  async init() {
    if (!this.audioCtx) this.createContext();

    // Pre-render synthesized clap variants
    this.clapVariants = await synthesizeClapVariants();

    // Decode embedded CC0 sample if available
    if (CC0_SAMPLE_BASE64) {
      try {
        const binary = atob(CC0_SAMPLE_BASE64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        this.sampleBuffer = await this.decodeAudio(bytes.buffer.slice(0));
      } catch (e) {
        console.warn('Failed to decode embedded CC0 sample:', e);
      }
    }

    // Decode embedded foot stomp sample if available
    if (FOOTSTOMP_BASE64) {
      try {
        const binary = atob(FOOTSTOMP_BASE64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        this.footstompBuffer = await this.decodeAudio(bytes.buffer.slice(0));
      } catch (e) {
        console.warn('Failed to decode embedded foot stomp sample:', e);
      }
    }
  }

  /**
   * Decode a user-uploaded audio file.
   * @param {ArrayBuffer} arrayBuffer - The uploaded file data
   */
  async loadCustomSample(arrayBuffer) {
    this.customBuffer = await this.decodeAudio(arrayBuffer);
  }

  /**
   * Regenerate per-person characteristics for the given count.
   * @param {number} count - Number of clappers
   */
  regeneratePersons(count) {
    this.persons = [];
    const numVariants = this.clapVariants ? this.clapVariants.length : 1;
    for (let i = 0; i < count; i++) {
      this.persons.push({
        variantIndex: Math.floor(Math.random() * numVariants),
        pitchFactor: 0.92 + Math.random() * 0.16, // [0.92, 1.08]
        volumeFactor: 0.6 + Math.random() * 0.4,   // [0.6, 1.0]
      });
    }
  }

  /**
   * Get the appropriate AudioBuffer for a given person.
   * @param {object} person - Person characteristics
   * @param {number} [beatNumber] - Beat counter for pattern modes
   */
  getBuffer(person, beatNumber) {
    const source = this.state.soundSource;

    // Queen mode: foot-foot-clap-rest pattern
    if (source === 'queen') {
      const pos = beatNumber % 4;
      if (pos === 3) return null; // rest
      if (pos <= 1) return this.footstompBuffer; // foot stomp
      // pos === 2: clap — use synthesized variant
      if (this.clapVariants) return this.clapVariants[person.variantIndex];
      return null;
    }

    if (source === 'custom' && this.customBuffer) {
      return this.customBuffer;
    }
    if (source === 'sample' && this.sampleBuffer) {
      return this.sampleBuffer;
    }
    if (source === 'footstomp' && this.footstompBuffer) {
      return this.footstompBuffer;
    }
    // Default: synthesized
    if (this.clapVariants) {
      return this.clapVariants[person.variantIndex];
    }
    return null;
  }

  /**
   * Start playback.
   */
  start() {
    if (!this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    this.nextBeatTime = this.audioCtx.currentTime + 0.05;
    this.currentBeat = 0;
    this.clapEvents = [];

    this.schedulerTimer = setInterval(() => this.schedule(), SCHEDULE_INTERVAL_MS);
  }

  /**
   * Stop playback.
   */
  stop() {
    if (this.schedulerTimer !== null) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  /**
   * Update master volume.
   * @param {number} vol - Volume 0-1
   */
  setVolume(vol) {
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
    }
  }

  /**
   * Lookahead scheduler - called every SCHEDULE_INTERVAL_MS.
   * Schedules all beats that fall within the lookahead window.
   */
  schedule() {
    const lookaheadSec = LOOKAHEAD_MS / 1000;
    const beatInterval = 60 / this.state.bpm;

    while (this.nextBeatTime < this.audioCtx.currentTime + lookaheadSec) {
      this.scheduleBeat(this.nextBeatTime, this.currentBeat);
      this.nextBeatTime += beatInterval;
      this.currentBeat++;
    }
  }

  /**
   * Schedule all claps for a single beat.
   * @param {number} beatTime - The exact time of the beat in audio context time
   * @param {number} beatNumber - Sequential beat counter (used for pattern modes)
   */
  scheduleBeat(beatTime, beatNumber) {
    const { clapperCount, spread, distribution, betaAlpha, betaBeta } = this.state;

    let personsToSchedule;
    let gainScale = 1;

    // Level-of-detail: subsample for large crowds
    if (clapperCount > LOD_CLAPPER_THRESHOLD) {
      personsToSchedule = this.samplePersons(LOD_SAMPLE_COUNT);
      gainScale = Math.sqrt(clapperCount / LOD_SAMPLE_COUNT);
    } else {
      personsToSchedule = this.persons.slice(0, clapperCount);
    }

    for (let pi = 0; pi < personsToSchedule.length; pi++) {
      const person = personsToSchedule[pi];
      const offsetMs = sampleOffset(distribution, spread, betaAlpha, betaBeta);
      const offsetSec = offsetMs / 1000;
      const clapTime = beatTime + offsetSec;

      // Skip if clap time is in the past
      if (clapTime < this.audioCtx.currentTime - 0.1) continue;

      const buffer = this.getBuffer(person, beatNumber);
      if (!buffer) continue;

      // Create source node
      const source = this.audioCtx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = person.pitchFactor;

      // Per-clap gain
      const gain = this.audioCtx.createGain();
      gain.gain.value = person.volumeFactor * gainScale;

      source.connect(gain);
      gain.connect(this.masterGain);

      source.start(Math.max(clapTime, this.audioCtx.currentTime));

      // Log event for visualization
      this.logEvent(beatTime, offsetMs, pi);
    }
  }

  /**
   * Randomly sample a subset of persons for LOD.
   */
  samplePersons(count) {
    const total = this.persons.length;
    if (total <= count) return this.persons;

    const sampled = [];
    const indices = new Set();
    while (indices.size < count) {
      indices.add(Math.floor(Math.random() * total));
    }
    for (const i of indices) {
      sampled.push(this.persons[i]);
    }
    return sampled;
  }

  /**
   * Log a clap event for the visualization to consume.
   */
  logEvent(beatTime, offsetMs, personIndex) {
    this.clapEvents.push({
      beatTime,
      offsetMs,
      personIndex,
      timestamp: performance.now(),
    });

    // Trim old events
    if (this.clapEvents.length > this.maxEvents) {
      this.clapEvents = this.clapEvents.slice(-Math.floor(this.maxEvents * 0.7));
    }
  }
}
