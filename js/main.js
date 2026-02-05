/**
 * App initialization, UI event binding, state management.
 */

import { DEFAULTS } from './constants.js';
import { AudioEngine } from './audio-engine.js';
import { Visualization } from './visualization.js';

// App state
const state = {
  playing: false,
  bpm: DEFAULTS.bpm,
  clapperCount: DEFAULTS.clapperCount,
  spread: DEFAULTS.spread,
  distribution: DEFAULTS.distribution,
  betaAlpha: DEFAULTS.betaAlpha,
  betaBeta: DEFAULTS.betaBeta,
  soundSource: DEFAULTS.soundSource,
  volume: DEFAULTS.volume,
  customSampleBuffer: null,
};

let engine = null;
let viz = null;
let initialized = false;

// DOM elements
const playBtn = document.getElementById('play-btn');
const bpmSlider = document.getElementById('bpm');
const bpmVal = document.getElementById('bpm-val');
const clappersSlider = document.getElementById('clappers');
const clappersVal = document.getElementById('clappers-val');
const spreadSlider = document.getElementById('spread');
const spreadVal = document.getElementById('spread-val');
const distSelect = document.getElementById('distribution');
const betaAlphaSlider = document.getElementById('beta-alpha');
const alphaVal = document.getElementById('alpha-val');
const betaBetaSlider = document.getElementById('beta-beta');
const betaVal = document.getElementById('beta-val');
const alphaControl = document.getElementById('alpha-control');
const betaControl = document.getElementById('beta-control');
const sourceRadios = document.querySelectorAll('input[name="source"]');
const volumeSlider = document.getElementById('volume');
const customFile = document.getElementById('custom-file');
const uploadBtn = document.getElementById('upload-btn');
const canvas = document.getElementById('viz-canvas');

/**
 * Initialize the audio engine and visualization on first user interaction.
 */
async function initOnce() {
  if (initialized) return;
  initialized = true;

  engine = new AudioEngine();
  await engine.init();
  engine.state = state;
  engine.regeneratePersons(state.clapperCount);
  engine.setVolume(state.volume);

  viz = new Visualization(canvas, engine, state);

  // Handle window resize
  window.addEventListener('resize', () => {
    if (viz) viz.resize();
  });
}

// Play/Stop toggle
playBtn.addEventListener('click', async () => {
  await initOnce();

  if (state.playing) {
    state.playing = false;
    engine.stop();
    viz.stop();
    playBtn.textContent = '\u25B6 Play';
    playBtn.classList.remove('active');
  } else {
    state.playing = true;
    engine.start();
    viz.start();
    playBtn.textContent = '\u25A0 Stop';
    playBtn.classList.add('active');
  }
});

// BPM
bpmSlider.addEventListener('input', () => {
  state.bpm = Number(bpmSlider.value);
  bpmVal.textContent = state.bpm;
});

// Clappers
clappersSlider.addEventListener('input', () => {
  state.clapperCount = Number(clappersSlider.value);
  clappersVal.textContent = state.clapperCount;
  if (engine) {
    engine.regeneratePersons(state.clapperCount);
  }
});

// Spread
spreadSlider.addEventListener('input', () => {
  state.spread = Number(spreadSlider.value);
  spreadVal.textContent = state.spread + 'ms';
});

// Distribution type
distSelect.addEventListener('change', () => {
  state.distribution = distSelect.value;
  const isBeta = state.distribution === 'beta';
  alphaControl.classList.toggle('hidden', !isBeta);
  betaControl.classList.toggle('hidden', !isBeta);
});

// Beta alpha
betaAlphaSlider.addEventListener('input', () => {
  state.betaAlpha = Number(betaAlphaSlider.value);
  alphaVal.textContent = state.betaAlpha.toFixed(1);
});

// Beta beta
betaBetaSlider.addEventListener('input', () => {
  state.betaBeta = Number(betaBetaSlider.value);
  betaVal.textContent = state.betaBeta.toFixed(1);
});

// Sound source
sourceRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    state.soundSource = radio.value;
  });
});

// Volume
volumeSlider.addEventListener('input', () => {
  state.volume = Number(volumeSlider.value);
  if (engine) {
    engine.setVolume(state.volume);
  }
});

// Custom file upload
uploadBtn.addEventListener('click', () => {
  customFile.click();
});

customFile.addEventListener('change', async () => {
  const file = customFile.files[0];
  if (!file) return;

  await initOnce();

  const arrayBuffer = await file.arrayBuffer();
  try {
    await engine.loadCustomSample(arrayBuffer);
    // Auto-select custom source
    state.soundSource = 'custom';
    document.querySelector('input[name="source"][value="custom"]').checked = true;
  } catch (e) {
    console.error('Failed to decode audio file:', e);
  }
});
