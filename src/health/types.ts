export type HealthSignalSeverity = 'warning' | 'error';

export interface HealthNodeRef {
  id?: string;
  path?: string;
}

export interface HealthEdgeRef {
  source: HealthNodeRef;
  target: HealthNodeRef;
}

export interface HealthSignal {
  id?: string;
  severity: HealthSignalSeverity;
  source: string;
  message: string;
  timestamp?: string;
  node?: HealthNodeRef;
  edge?: HealthEdgeRef;
}
