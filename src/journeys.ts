import type { ArchNode } from './types';

export interface JourneyStop {
  id: string;
  nodeId: string;
  title: string;
  note?: string;
  durationMs: number;
}

export function journeyStopFromNode(node: ArchNode): JourneyStop {
  return {
    id: `journey:${node.id}:${Date.now()}`,
    nodeId: node.id,
    title: node.label,
    durationMs: 2200,
  };
}
