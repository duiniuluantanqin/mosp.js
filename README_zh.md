# mosp.js

[English](README.md)

MOSP（Metadata over SEI Protocol）视频流元数据解析与叠加渲染库。协议规范详见 [`docs/metadata-over-sei-protocol.txt`](docs/metadata-over-sei-protocol.txt)。

## 安装

```bash
npm install mosp.js
```

## 使用

```ts
import { MOSPOverlay } from 'mosp.js';

const video = document.getElementById('video') as HTMLVideoElement;

const overlay = new MOSPOverlay({
  lineWidth: 2,
  labelFields: ['object_id', 'type', 'confidence']
});

overlay.attachMedia(video);
overlay.show();

// 将播放器提取的 SEI 数据传入，例如 mpegts.js 的 SEI_ARRIVED 事件
overlay.pushData(seiData);

// 随时更新配置
overlay.configure({ lineWidth: 3 });

// 销毁时清理
overlay.detachMedia();
```

### `RendererConfig`

| 选项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `boxColor` | `string \| null` | `null` | 默认检测框颜色；`null` 时按目标类型自动分配颜色 |
| `lineWidth` | `number` | `2` | 检测框描边宽度（像素） |
| `labelFields` | `LabelField[]` | 全部字段 | 标签中显示的字段 |
| `typeConfigs` | `Record<string, TypeConfig>` | `{}` | 按目标类型覆盖颜色和样式 |
| `textConfig` | `TextConfig` | 见下方 | OSD 文字渲染样式 |
| `maxDetectionFrames` | `number` | `100` | 用于 PTS 匹配的帧缓冲数量 |

`TextConfig` 默认值：`fontFamily: 'Arial'`、`fontSize: 16`、`padding: 4`、`textColor: '#ffffff'`、`backgroundColor: 'rgba(0,0,0,0.6)'`。

### `getDebugInfo()`

返回时间同步与缓冲区诊断信息：

```ts
interface DebugInfo {
  videoCurrentTimeMs: number | null;  // 当前视频播放时间（ms）
  seiPtsMs: number | null;            // 匹配帧的 SEI PTS（ms）
  diffMs: number | null;              // 视频时间与 SEI PTS 的差值（ms）
  bufferedFrames: number;             // 当前缓冲帧数
  firstBufferedPtsMs: number | null;  // 缓冲区最早帧的 PTS（ms）
  lastBufferedPtsMs: number | null;   // 缓冲区最新帧的 PTS（ms）
  matchedFrameIndex: number | null;   // 当前匹配帧在缓冲区中的索引
  paused: boolean;                    // 视频是否处于暂停状态
}
```

## 构建

```bash
npm install
npm run build:all   # 类型声明 + UMD + ES 模块
npm run build       # 仅 UMD
npm run build:tsc   # 仅类型声明
```

产物输出到 `dist/` 目录。

## 测试

```bash
npm test            # 监听模式
npx vitest --run    # 单次运行
```

## Demo

先执行构建，然后在浏览器中打开 [`examples/index.html`](examples/index.html)。Demo 使用 [mpegts.js](https://github.com/xqq/mpegts.js) 播放 MPEG-TS 直播流，并通过 `SEI_ARRIVED` 事件将 SEI 数据传入 `MOSPOverlay`。
