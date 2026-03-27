import { describe, it, expect, beforeEach } from 'vitest';
import { MSPParser } from '../src/parser/parser';

describe('MSPParser', () => {
  let parser: MSPParser;

  beforeEach(() => {
    parser = new MSPParser();
  });

  it('should create parser instance', () => {
    expect(parser).toBeDefined();
  });

  it('should parse already formatted data', () => {
    const mockData = {
      pts: 1.5,
      detections: [
        {
          type: 1,
          confidence: 0.95,
          bbox: { x: 0.1, y: 0.1, width: 0.2, height: 0.15 }
        }
      ]
    };

    const result = parser.parse(mockData);
    expect(result).toEqual(mockData);
  });

  it('should return null for invalid data', () => {
    expect(parser.parse(null)).toBeNull();
    expect(parser.parse(undefined)).toBeNull();
    expect(parser.parse({})).toBeNull();
    expect(parser.parse('invalid')).toBeNull();
  });

  it('should parse mpegts.js SEIData format', () => {
    const uuid = new Uint8Array([
      0x83, 0xA1, 0x61, 0xC4,
      0x31, 0xA7, 0x4B, 0xD8,
      0xA6, 0x93, 0x52, 0x11,
      0x3A, 0x41, 0x10, 0x7E
    ]);

    const userData = new Uint8Array([
      0x02,
      0x01,
      0x00, 0x00, 0x00, 0x64,
      0x00,
      0x00, 0x01,
      0xF0,
      0x40, 0x00,
      0x40, 0x00,
      0x20, 0x00,
      0x20, 0x00
    ]);

    const seiData = {
      type: 5,
      size: uuid.byteLength + userData.byteLength,
      uuid,
      user_data: userData,
      pts: 1.5
    };

    const result = parser.parse(seiData);

    expect(result).not.toBeNull();
    expect(result?.pts).toBe(1.5);
    expect(result?.detections).toHaveLength(1);

    const detection = result?.detections[0];
    expect(detection?.type).toBe(1);
    expect(detection?.confidence).toBeCloseTo(0.941, 2);
    expect(detection?.bbox.x).toBeCloseTo(0.25, 2);
    expect(detection?.bbox.y).toBeCloseTo(0.25, 2);
    expect(detection?.bbox.width).toBeCloseTo(0.125, 2);
    expect(detection?.bbox.height).toBeCloseTo(0.125, 2);
  });

  it('should parse multiple detections', () => {
    const uuid = new Uint8Array([
      0x83, 0xA1, 0x61, 0xC4,
      0x31, 0xA7, 0x4B, 0xD8,
      0xA6, 0x93, 0x52, 0x11,
      0x3A, 0x41, 0x10, 0x7E
    ]);

    const userData = new Uint8Array([
      0x02,
      0x02,
      0x00, 0x00, 0x00, 0x64,
      0x00, 0x00, 0x01, 0xF0,
      0x40, 0x00, 0x40, 0x00,
      0x20, 0x00, 0x20, 0x00,
      0x01, 0x00, 0x02, 0xE0,
      0x80, 0x00, 0x60, 0x00,
      0x30, 0x00, 0x40, 0x00
    ]);

    const seiData = {
      type: 5,
      size: uuid.byteLength + userData.byteLength,
      uuid,
      user_data: userData,
      pts: 2.0
    };

    const result = parser.parse(seiData);
    expect(result?.detections).toHaveLength(2);
    expect(result?.detections[0].type).toBe(1);
    expect(result?.detections[1].type).toBe(2);
  });

  it('should return null for wrong UUID', () => {
    const wrongUuid = new Uint8Array(16).fill(0xFF);
    const userData = new Uint8Array([0x02, 0x00, 0x00, 0x00, 0x00, 0x00]);

    const seiData = {
      type: 5,
      size: wrongUuid.byteLength + userData.byteLength,
      uuid: wrongUuid,
      user_data: userData,
      pts: 1.0
    };

    const result = parser.parse(seiData);
    expect(result).toBeNull();
  });

  it('should return null for wrong version', () => {
    const uuid = new Uint8Array([
      0x83, 0xA1, 0x61, 0xC4,
      0x31, 0xA7, 0x4B, 0xD8,
      0xA6, 0x93, 0x52, 0x11,
      0x3A, 0x41, 0x10, 0x7E
    ]);

    const userData = new Uint8Array([
      0x01,
      0x00, 0x00, 0x00, 0x00, 0x00
    ]);

    const seiData = {
      type: 5,
      size: uuid.byteLength + userData.byteLength,
      uuid,
      user_data: userData,
      pts: 1.0
    };

    const result = parser.parse(seiData);
    expect(result).toBeNull();
  });

  it('should handle empty detections', () => {
    const uuid = new Uint8Array([
      0x83, 0xA1, 0x61, 0xC4,
      0x31, 0xA7, 0x4B, 0xD8,
      0xA6, 0x93, 0x52, 0x11,
      0x3A, 0x41, 0x10, 0x7E
    ]);

    const userData = new Uint8Array([
      0x02,
      0x00,
      0x00, 0x00, 0x00, 0x00
    ]);

    const seiData = {
      type: 5,
      size: uuid.byteLength + userData.byteLength,
      uuid,
      user_data: userData,
      pts: 1.0
    };

    const result = parser.parse(seiData);
    expect(result).toBeNull();
  });
});
