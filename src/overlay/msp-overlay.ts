import { MSPParser } from '../parser/parser';
import { OverlayRenderer, OverlayRendererConfig } from './overlay-renderer';

export class MSPOverlay {
  private parser: MSPParser;
  private renderer: OverlayRenderer;

  constructor(config?: OverlayRendererConfig) {
    this.parser = new MSPParser();
    this.renderer = new OverlayRenderer(config);
  }

  attachMedia(mediaElement: HTMLVideoElement): void {
    this.renderer.attachMedia(mediaElement);
  }

  detachMedia(): void {
    this.renderer.detachMedia();
  }

  pushData(data: any): void {
    const frame = this.parser.parse(data);
    if (frame) {
      this.renderer.pushFrame(frame);
    }
  }

  configure(config: OverlayRendererConfig): void {
    this.renderer.configure(config);
  }

  show(): void {
    this.renderer.show();
  }

  hide(): void {
    this.renderer.hide();
  }

  clear(): void {
    this.renderer.clear();
  }
}
