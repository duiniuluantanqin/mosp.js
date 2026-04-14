import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MSPParser } from '../src/parser/parser';

const uuid = new Uint8Array([
  0x4D, 0x45, 0x54, 0x41,
  0x44, 0x41, 0x54, 0x41,
  0x53, 0x45, 0x49, 0x42,
  0x59, 0x43, 0x48, 0x42
]);

const encoder = new TextEncoder();

function encodeUnit(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value)) * 65535);
}

function encodeConfidence(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value)) * 255);
}

function encodeAngle(value: number): number {
  const normalized = ((((value % 360) + 360) % 360) / 360);
  return Math.round(normalized * 65535);
}

function uint16Bytes(value: number): number[] {
  return [(value >> 8) & 0xFF, value & 0xFF];
}

function uint32Bytes(value: number): number[] {
  return [
    (value >>> 24) & 0xFF,
    (value >>> 16) & 0xFF,
    (value >>> 8) & 0xFF,
    value & 0xFF
  ];
}

/**
 * Creates a bbox item payload (item_payload only, without the 4-byte common header).
 * Common header: item_id(1) + item_type(1) + item_duration(2)
 */
function createBBoxItemPayload(input: {
  id: number;
  type: string;
  confidence: number;
  cx: number;
  cy: number;
  width: number;
  height: number;
  angle: number;
  distance: number;
}): Uint8Array {
  const typeBytes = encoder.encode(input.type);

  return new Uint8Array([
    ...uint16Bytes(input.id),
    typeBytes.length,
    encodeConfidence(input.confidence),
    ...uint16Bytes(encodeUnit(input.cx)),
    ...uint16Bytes(encodeUnit(input.cy)),
    ...uint16Bytes(encodeUnit(input.width)),
    ...uint16Bytes(encodeUnit(input.height)),
    ...uint16Bytes(encodeAngle(input.angle)),
    ...uint32Bytes(input.distance),
    ...typeBytes
  ]);
}

/**
 * Creates a text item payload (item_payload only, without the 4-byte common header).
 */
function createTextItemPayload(input: {
  text: string;
  flags: number;
  style: number;
  x: number;
  y: number;
  width: number;
  height: number;
  textColor: number;
  backgroundColor: number;
}): Uint8Array {
  const textBytes = encoder.encode(input.text);

  return new Uint8Array([
    input.flags,
    input.style,
    ...uint16Bytes(encodeUnit(input.x)),
    ...uint16Bytes(encodeUnit(input.y)),
    ...uint16Bytes(encodeUnit(input.width)),
    ...uint16Bytes(encodeUnit(input.height)),
    textBytes.length,
    0x00, // reserved
    ...uint32Bytes(input.textColor),
    ...uint32Bytes(input.backgroundColor),
    ...textBytes
  ]);
}

/**
 * Wraps an item payload with the 4-byte common header:
 * item_id(1) + item_type(1) + item_duration(2)
 */
function wrapItem(itemId: number, itemType: number, itemDuration: number, payload: Uint8Array): Uint8Array {
  const result = new Uint8Array(4 + payload.byteLength);
  result[0] = itemId;
  result[1] = itemType;
  result[2] = (itemDuration >> 8) & 0xFF;
  result[3] = itemDuration & 0xFF;
  result.set(payload, 4);
  return result;
}

function createBBoxItem(input: {
  itemId?: number;
  itemDuration?: number;
  id: number;
  type: string;
  confidence: number;
  cx: number;
  cy: number;
  width: number;
  height: number;
  angle: number;
  distance: number;
}): Uint8Array {
  const payload = createBBoxItemPayload(input);
  return wrapItem(input.itemId ?? 0, 0x01, input.itemDuration ?? 0, payload);
}

function createTextItem(input: {
  itemId?: number;
  itemDuration?: number;
  text: string;
  flags: number;
  style: number;
  x: number;
  y: number;
  width: number;
  height: number;
  textColor: number;
  backgroundColor: number;
}): Uint8Array {
  const payload = createTextItemPayload(input);
  return wrapItem(input.itemId ?? 0, 0x02, input.itemDuration ?? 0, payload);
}

function createPayload(items: Uint8Array[]): Uint8Array {
  const totalLength = 4 + items.reduce((length, item) => length + item.byteLength, 0);
  const payload = new Uint8Array(totalLength);

  payload[0] = 0x01; // version
  payload[1] = 0x00; // reserved1
  payload[2] = 0x00; // reserved2
  payload[3] = items.length; // item_count

  let offset = 4;
  items.forEach((item) => {
    payload.set(item, offset);
    offset += item.byteLength;
  });

  return payload;
}

describe('MSPParser', () => {
  let parser: MSPParser;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    parser = new MSPParser();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('should create parser instance', () => {
    expect(parser).toBeDefined();
  });

  it('should return null for invalid data', () => {
    expect(parser.parse(null)).toBeNull();
    expect(parser.parse(undefined)).toBeNull();
    expect(parser.parse({})).toBeNull();
    expect(parser.parse('invalid')).toBeNull();
  });

  it('should parse SEIData with a rotated bbox item and text item', () => {
    const userData = createPayload([
      createBBoxItem({
        itemId: 1,
        itemDuration: 0,
        id: 256,
        type: 'person',
        confidence: 240 / 255,
        cx: 0.25,
        cy: 0.25,
        width: 0.125,
        height: 0.125,
        angle: 30,
        distance: 1000000
      }),
      createTextItem({
        itemId: 2,
        itemDuration: 0,
        text: 'helmet',
        flags: 0b00000100,
        style: 2,
        x: 0.2,
        y: 0.15,
        width: 0.18,
        height: 0.05,
        textColor: 0xFFFFFFFF,
        backgroundColor: 0x00000099
      })
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
    expect(result?.texts).toHaveLength(1);

    const detection = result?.detections[0];
    expect(detection?.item_id).toBe(1);
    expect(detection?.item_duration).toBe(0);
    expect(detection?.type).toBe('person');
    expect(detection?.confidence).toBeCloseTo(0.941, 2);
    expect(detection?.bbox.cx).toBeCloseTo(0.25, 2);
    expect(detection?.bbox.cy).toBeCloseTo(0.25, 2);
    expect(detection?.bbox.width).toBeCloseTo(0.125, 2);
    expect(detection?.bbox.height).toBeCloseTo(0.125, 2);
    expect(detection?.bbox.angle).toBeCloseTo(30, 0);

    const text = result?.texts[0];
    expect(text?.item_id).toBe(2);
    expect(text?.item_duration).toBe(0);
    expect(text?.text).toBe('helmet');
    expect(text?.x).toBeCloseTo(0.2, 2);
    expect(text?.width).toBeCloseTo(0.18, 2);
  });

  it('should parse multiple detections', () => {
    const userData = createPayload([
      createBBoxItem({
        itemId: 1,
        id: 256,
        type: 'person',
        confidence: 224 / 255,
        cx: 0.5,
        cy: 0.375,
        width: 0.1875,
        height: 0.25,
        angle: 0,
        distance: 500000
      }),
      createBBoxItem({
        itemId: 2,
        id: 512,
        type: 'vehicle',
        confidence: 192 / 255,
        cx: 0.25,
        cy: 0.15,
        width: 0.094,
        height: 0.125,
        angle: 45,
        distance: 300000
      })
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
    expect(result?.detections[0].type).toBe('person');
    expect(result?.detections[1].type).toBe('vehicle');
  });

  it('should parse item_duration correctly', () => {
    const userData = createPayload([
      createTextItem({
        itemId: 5,
        itemDuration: 1000,
        text: '12:34:56',
        flags: 0,
        style: 0,
        x: 0.0,
        y: 0.0,
        width: 0.2,
        height: 0.05,
        textColor: 0xFFFFFFFF,
        backgroundColor: 0x00000099
      })
    ]);

    const seiData = {
      type: 5,
      size: uuid.byteLength + userData.byteLength,
      uuid,
      user_data: userData,
      pts: 5000
    };

    const result = parser.parse(seiData);
    expect(result?.texts[0].item_id).toBe(5);
    expect(result?.texts[0].item_duration).toBe(1000);
    expect(result?.texts[0].text).toBe('12:34:56');
  });

  it('should return null for wrong UUID', () => {
    const wrongUuid = new Uint8Array(16).fill(0xFF);
    const userData = new Uint8Array([0x01, 0x00, 0x00, 0x00]);

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
    const userData = new Uint8Array([0x63, 0x00, 0x00, 0x00]);

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

  it('should handle empty items', () => {
    const userData = new Uint8Array([0x01, 0x00, 0x00, 0x00]);

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

  it('should return null for truncated item header', () => {
    // Payload claims 1 item but only has 3 bytes after the header (need 4 for item header)
    const userData = new Uint8Array([0x01, 0x00, 0x00, 0x01, 0x01, 0x01, 0x00]);

    const result = parser.parse({
      type: 5,
      size: uuid.byteLength + userData.byteLength,
      uuid,
      user_data: userData,
      pts: 1.0
    });

    expect(result).toBeNull();
  });
});
