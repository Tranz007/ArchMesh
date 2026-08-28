import { describe, expect, it } from 'vitest';
import { extensionForMimeType, safeRecordingName } from './recording';

describe('recording helpers', () => {
  it('keeps the downloaded container truthful to the recorder mime type', () => {
    expect(extensionForMimeType('video/mp4;codecs=avc1.42E01E', 'webm')).toBe('mp4');
    expect(extensionForMimeType('video/webm;codecs=vp9', 'mp4')).toBe('webm');
    expect(extensionForMimeType(undefined, 'webm')).toBe('webm');
  });

  it('creates a stable safe local journey filename', () => {
    expect(safeRecordingName('Example Workspace', 'mp4')).toBe('example-workspace-archmesh-journey.mp4');
    expect(safeRecordingName('  ', 'webm')).toBe('architecture-archmesh-journey.webm');
  });
});
