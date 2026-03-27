export interface MSPDetection {
  type: number;
  confidence: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface MSPData {
  pts: number;
  detections: MSPDetection[];
}

export interface SEIData {
  type: number;
  size: number;
  uuid: Uint8Array;
  user_data: Uint8Array;
  pts?: number;
}

const COMPACT_PAYLOAD_V2_UUID = new Uint8Array([
  0x83, 0xA1, 0x61, 0xC4,
  0x31, 0xA7, 0x4B, 0xD8,
  0xA6, 0x93, 0x52, 0x11,
  0x3A, 0x41, 0x10, 0x7E
]);

export class MSPParser {
  parse(data: any): MSPData | null {
    if (data && typeof data === 'object' && 'pts' in data && 'detections' in data) {
      return data as MSPData;
    }

    if (data && typeof data === 'object' && 'uuid' in data && 'user_data' in data) {
      return this.parseFromSEIData(data as SEIData);
    }

    return null;
  }

  private parseFromSEIData(seiData: SEIData): MSPData | null {
    try {
      if (!this.buffersAreEqual(seiData.uuid, COMPACT_PAYLOAD_V2_UUID)) {
        return null;
      }

      const detections = this.parseCompactPayloadV2(seiData.user_data);
      if (!detections || detections.length === 0) {
        return null;
      }

      return {
        pts: seiData.pts || 0,
        detections
      };
    } catch (error) {
      console.error('MSP parsing error:', error);
      return null;
    }
  }

  private parseCompactPayloadV2(payload: Uint8Array): MSPDetection[] | null {
    if (!payload || payload.byteLength < 6) {
      return null;
    }

    const version = payload[0];
    if (version !== 2) {
      console.warn(`Unsupported Compact Payload version: ${version}`);
      return null;
    }

    const declaredObjectCount = payload[1];
    const availableObjectCount = Math.min(
      declaredObjectCount,
      Math.floor((payload.byteLength - 6) / 12)
    );

    if (availableObjectCount === 0) {
      return null;
    }

    const detections: MSPDetection[] = [];
    let offset = 6;

    for (let i = 0; i < availableObjectCount; i++) {
      const objectType = this.readUint16BE(payload, offset + 1);
      const confidenceQ = payload[offset + 3];
      const xQ = this.readUint16BE(payload, offset + 4);
      const yQ = this.readUint16BE(payload, offset + 6);
      const wQ = this.readUint16BE(payload, offset + 8);
      const hQ = this.readUint16BE(payload, offset + 10);

      detections.push({
        type: objectType,
        confidence: this.quantizedByteToUnit(confidenceQ),
        bbox: {
          x: this.quantizedWordToUnit(xQ),
          y: this.quantizedWordToUnit(yQ),
          width: this.quantizedWordToUnit(wQ),
          height: this.quantizedWordToUnit(hQ)
        }
      });

      offset += 12;
    }

    return detections;
  }

  private readUint16BE(data: Uint8Array, offset: number): number {
    return (data[offset] << 8) | data[offset + 1];
  }

  private quantizedByteToUnit(value: number): number {
    return value / 255;
  }

  private quantizedWordToUnit(value: number): number {
    return value / 65535;
  }

  private buffersAreEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.byteLength !== b.byteLength) {
      return false;
    }

    for (let i = 0; i < a.byteLength; i++) {
      if (a[i] !== b[i]) {
        return false;
      }
    }

    return true;
  }
}
