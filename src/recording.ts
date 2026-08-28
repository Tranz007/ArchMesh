export interface RecordingFormat {
  mimeType?: string;
  extension: 'mp4' | 'webm';
}

const preferredTypes: RecordingFormat[] = [
  { mimeType: 'video/mp4;codecs=avc1.42E01E', extension: 'mp4' },
  { mimeType: 'video/mp4', extension: 'mp4' },
  { mimeType: 'video/webm;codecs=vp9', extension: 'webm' },
  { mimeType: 'video/webm;codecs=vp8', extension: 'webm' },
  { mimeType: 'video/webm', extension: 'webm' },
];

export function preferredRecordingFormat(): RecordingFormat {
  if (typeof MediaRecorder === 'undefined') return { extension: 'webm' };
  for (const candidate of preferredTypes) {
    if (candidate.mimeType && MediaRecorder.isTypeSupported(candidate.mimeType)) return candidate;
  }
  return { extension: 'webm' };
}

export function extensionForMimeType(mimeType: string | undefined, fallback: RecordingFormat['extension']) {
  if (mimeType?.toLowerCase().includes('mp4')) return 'mp4' as const;
  if (mimeType?.toLowerCase().includes('webm')) return 'webm' as const;
  return fallback;
}

export function safeRecordingName(project: string, extension: 'mp4' | 'webm') {
  const normalized = project
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'architecture';
  return `${normalized}-archmesh-journey.${extension}`;
}
