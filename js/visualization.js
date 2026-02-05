/**
 * Canvas-based timing visualization.
 * Top ~70%: scatter plot of clap offsets around the beat line.
 * Bottom ~30%: histogram of offset distribution with theoretical curve overlay.
 */

import { VIZ_HISTORY_BEATS } from './constants.js';

const SCATTER_RATIO = 0.68;
const HISTO_RATIO = 0.28;
const GAP_RATIO = 0.04;
const DOT_RADIUS = 2.5;
const HISTO_BINS = 40;

export class Visualization {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import('./audio-engine.js').AudioEngine} engine
   * @param {object} state
   */
  constructor(canvas, engine, state) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.engine = engine;
    this.state = state;
    this.animFrame = null;

    // Track last known distribution settings for histogram reset
    this.lastDistribution = state.distribution;
    this.lastSpread = state.spread;

    // Histogram accumulator
    this.histogramData = new Float64Array(HISTO_BINS);
    this.histogramTotal = 0;
    this.lastProcessedEventIndex = 0;

    this.resize();
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = rect.width;
    this.height = rect.height;
  }

  start() {
    this.lastProcessedEventIndex = 0;
    this.histogramData.fill(0);
    this.histogramTotal = 0;
    const loop = () => {
      this.draw();
      this.animFrame = requestAnimationFrame(loop);
    };
    this.animFrame = requestAnimationFrame(loop);
  }

  stop() {
    if (this.animFrame !== null) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
  }

  draw() {
    const w = this.width;
    const h = this.height;
    const scatterH = h * SCATTER_RATIO;
    const gapH = h * GAP_RATIO;
    const histoH = h * HISTO_RATIO;
    const histoY = scatterH + gapH;

    // Check if distribution settings changed - reset histogram
    if (this.state.distribution !== this.lastDistribution || this.state.spread !== this.lastSpread) {
      this.histogramData.fill(0);
      this.histogramTotal = 0;
      this.lastDistribution = this.state.distribution;
      this.lastSpread = this.state.spread;
    }

    const ctx = this.ctx;

    // Clear with dark background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);

    this.drawScatter(ctx, w, scatterH);
    this.drawHistogram(ctx, w, histoH, histoY);
  }

  drawScatter(ctx, w, h) {
    const events = this.engine.clapEvents;
    const now = performance.now();
    const spread = Math.max(this.state.spread, 10);
    const displayRange = spread * 3; // Show ±3x spread
    const centerX = w / 2;

    // Beat line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, h);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('0ms', centerX, h - 4);
    ctx.textAlign = 'left';
    ctx.fillText(`-${Math.round(displayRange)}ms`, 4, h - 4);
    ctx.textAlign = 'right';
    ctx.fillText(`+${Math.round(displayRange)}ms`, w - 4, h - 4);

    // Find the current beat window - show events from last N beats
    const beatInterval = 60 / this.state.bpm;
    const windowMs = beatInterval * VIZ_HISTORY_BEATS * 1000;

    // Draw dots for recent events
    for (let i = events.length - 1; i >= 0; i--) {
      const ev = events[i];
      const age = now - ev.timestamp;
      if (age > windowMs) break;

      // Fade based on age
      const alpha = Math.max(0, 1 - age / windowMs);
      if (alpha <= 0) continue;

      // X position: offset mapped to canvas width
      const x = centerX + (ev.offsetMs / displayRange) * (w / 2);
      if (x < 0 || x > w) continue;

      // Y position: spread persons across height with slight jitter per beat
      const clapperCount = Math.max(this.state.clapperCount, 1);
      const normalizedY = (ev.personIndex % clapperCount) / clapperCount;
      const jitter = Math.sin(ev.beatTime * 137.5 + ev.personIndex * 7.3) * 0.02;
      const y = (normalizedY + jitter) * (h - 20) + 10;

      // Color based on person index
      const hue = (ev.personIndex * 137.5) % 360;
      ctx.fillStyle = `hsla(${hue}, 70%, 65%, ${alpha * 0.8})`;
      ctx.beginPath();
      ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawHistogram(ctx, w, h, yOffset) {
    const events = this.engine.clapEvents;
    const spread = Math.max(this.state.spread, 10);
    const displayRange = spread * 3;
    const centerX = w / 2;

    // Process new events into histogram
    for (let i = this.lastProcessedEventIndex; i < events.length; i++) {
      const offsetMs = events[i].offsetMs;
      const bin = Math.floor(((offsetMs + displayRange) / (2 * displayRange)) * HISTO_BINS);
      if (bin >= 0 && bin < HISTO_BINS) {
        this.histogramData[bin]++;
        this.histogramTotal++;
      }
    }
    this.lastProcessedEventIndex = events.length;

    // Decay old data gradually
    if (this.histogramTotal > 500) {
      const decay = 0.995;
      for (let i = 0; i < HISTO_BINS; i++) {
        this.histogramData[i] *= decay;
      }
      this.histogramTotal *= decay;
    }

    // Find max bin for scaling
    let maxBin = 0;
    for (let i = 0; i < HISTO_BINS; i++) {
      if (this.histogramData[i] > maxBin) maxBin = this.histogramData[i];
    }
    if (maxBin === 0) maxBin = 1;

    // Draw separator line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, yOffset);
    ctx.lineTo(w, yOffset);
    ctx.stroke();

    // Draw beat line in histogram area
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.moveTo(centerX, yOffset);
    ctx.lineTo(centerX, yOffset + h);
    ctx.stroke();

    // Draw histogram bars
    const barWidth = w / HISTO_BINS;
    for (let i = 0; i < HISTO_BINS; i++) {
      const barH = (this.histogramData[i] / maxBin) * (h - 10);
      if (barH < 0.5) continue;
      const x = i * barWidth;
      const y = yOffset + h - barH;

      ctx.fillStyle = 'rgba(100, 180, 255, 0.6)';
      ctx.fillRect(x + 1, y, barWidth - 2, barH);
    }

    // Draw theoretical distribution curve overlay
    this.drawTheoreticalCurve(ctx, w, h, yOffset, displayRange, maxBin);
  }

  drawTheoreticalCurve(ctx, w, h, yOffset, displayRange, maxBin) {
    const { distribution: distType, spread, betaAlpha, betaBeta } = this.state;
    const effectiveSpread = Math.max(spread, 1);

    ctx.strokeStyle = 'rgba(255, 200, 100, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    const binWidth = (2 * displayRange) / HISTO_BINS;
    // Calculate the peak density for normalization
    let peakDensity = 0;

    for (let px = 0; px < w; px += 2) {
      const offset = ((px / w) * 2 - 1) * displayRange;
      const density = theoreticalDensity(distType, offset, effectiveSpread, betaAlpha, betaBeta);
      if (density > peakDensity) peakDensity = density;
    }
    if (peakDensity === 0) return;

    // Scale: the curve's peak should match the tallest bar
    const scale = (h - 10) / peakDensity;

    let started = false;
    for (let px = 0; px < w; px += 2) {
      const offset = ((px / w) * 2 - 1) * displayRange;
      const density = theoreticalDensity(distType, offset, effectiveSpread, betaAlpha, betaBeta);
      const y = yOffset + h - density * scale;

      if (!started) {
        ctx.moveTo(px, y);
        started = true;
      } else {
        ctx.lineTo(px, y);
      }
    }
    ctx.stroke();
  }
}

/**
 * Calculate the theoretical probability density at a given offset.
 */
function theoreticalDensity(type, x, spread, alpha, beta) {
  switch (type) {
    case 'normal': {
      const sigma = spread;
      return (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * (x / sigma) ** 2);
    }
    case 'uniform': {
      return Math.abs(x) <= spread ? 1 / (2 * spread) : 0;
    }
    case 'exponential': {
      const lambda = 2 / spread;
      return (lambda / 2) * Math.exp(-lambda * Math.abs(x));
    }
    case 'laplace': {
      const b = spread / Math.SQRT2;
      return (1 / (2 * b)) * Math.exp(-Math.abs(x) / b);
    }
    case 'beta': {
      // Beta mapped to [-spread, spread]
      const t = (x / spread + 1) / 2; // map to [0, 1]
      if (t <= 0 || t >= 1) return 0;
      return betaPDF(t, alpha, beta) / (2 * spread);
    }
    default:
      return 0;
  }
}

function betaPDF(x, a, b) {
  if (x <= 0 || x >= 1) return 0;
  const logB = lnGamma(a) + lnGamma(b) - lnGamma(a + b);
  return Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - logB);
}

// Stirling's approximation for ln(Gamma(x)) - Lanczos approximation
function lnGamma(z) {
  const g = 7;
  const c = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  }
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) {
    x += c[i] / (z + i);
  }
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
