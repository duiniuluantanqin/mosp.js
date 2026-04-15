# mosp.js

[中文文档](README_zh.md)

MOSP (Metadata over SEI Protocol) parsing and overlay rendering library for video streams. See [`docs/metadata-over-sei-protocol.txt`](docs/metadata-over-sei-protocol.txt) for the protocol specification.

## Install

```bash
npm install mosp.js
```

## Usage

```ts
import { MOSPOverlay } from 'mosp.js';

const video = document.getElementById('video') as HTMLVideoElement;

const overlay = new MOSPOverlay({
  lineWidth: 2,
  labelFields: ['object_id', 'type', 'confidence']
});

overlay.attachMedia(video);
overlay.show();

// Feed SEI data from your video player, e.g. mpegts.js SEI_ARRIVED event
overlay.pushData(seiData);

// Reconfigure at any time
overlay.configure({ lineWidth: 3 });

// Clean up
overlay.detachMedia();
```

### `RendererConfig`

| Option | Type | Default | Description |
|---|---|---|---|
| `boxColor` | `string \| null` | `null` | Default box color; `null` assigns colors per type automatically |
| `lineWidth` | `number` | `2` | Box stroke width in pixels |
| `labelFields` | `LabelField[]` | all fields | Fields shown in the detection label |
| `typeConfigs` | `Record<string, TypeConfig>` | `{}` | Per-type color and style overrides |
| `textConfig` | `TextConfig` | see below | OSD text rendering style |
| `maxDetectionFrames` | `number` | `100` | Frame buffer size for PTS matching |

`TextConfig` defaults: `fontFamily: 'Arial'`, `fontSize: 16`, `padding: 4`, `textColor: '#ffffff'`, `backgroundColor: 'rgba(0,0,0,0.6)'`.

### `getDebugInfo()`

Returns sync and buffer diagnostics:

```ts
interface DebugInfo {
  videoCurrentTimeMs: number | null;
  seiPtsMs: number | null;
  diffMs: number | null;
  bufferedFrames: number;
  firstBufferedPtsMs: number | null;
  lastBufferedPtsMs: number | null;
  matchedFrameIndex: number | null;
  paused: boolean;
}
```

## Build

```bash
npm install
npm run build:all   # type declarations + UMD + ES module
npm run build       # UMD only
npm run build:tsc   # type declarations only
```

Output goes to `dist/`.

## Test

```bash
npm test            # watch mode
npx vitest --run    # single run
```

## Demo

Build first, then open [`examples/index.html`](examples/index.html) in a browser. The demo uses [mpegts.js](https://github.com/xqq/mpegts.js) to play an MPEG-TS live stream and feeds SEI data to `MOSPOverlay` via the `SEI_ARRIVED` event.
