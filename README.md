# Clapmaker

A web app that simulates the sound of many people clapping in rhythm.

## Features

- **Adjustable timing**: BPM (40-240), number of clappers (1-500), timing spread (0-200ms)
- **5 statistical distributions**: Normal, Uniform, Exponential, Laplace, Beta (with adjustable α/β)
- **3 sound sources**: Synthesized claps, embedded sample, or upload your own
- **Real-time visualization**: Scatter plot showing timing offsets + histogram with theoretical curve overlay
- **Performance optimized**: Level-of-detail system for large crowds (>200 clappers)

## Usage

Serve the files with any static HTTP server:

```sh
python3 -m http.server 8080
```

Then open http://localhost:8080 in your browser and click Play.

## How It Works

- **Audio**: Uses Web Audio API with a lookahead scheduler (25ms interval, 100ms lookahead) for precise timing
- **Synthesis**: 12 pre-rendered clap variants using OfflineAudioContext with bandpass filters (2000-5000 Hz)
- **Per-person variation**: Each simulated clapper has unique pitch (±8%) and volume characteristics
- **Distributions**: Timing offsets sampled from the selected distribution, scaled by the spread parameter

## File Structure

```
index.html          - UI controls
css/styles.css      - Dark theme styling
js/
  main.js           - State management, UI binding
  audio-engine.js   - Web Audio scheduling
  synthesizer.js    - Clap buffer generation
  distributions.js  - Statistical sampling functions
  visualization.js  - Canvas rendering
  constants.js      - Config values, embedded sample
```

## License

MIT
