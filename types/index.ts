export type Sample = { name: string; url: string };
export type Library = Record<string, Sample[]>;

export interface CollaborationPayloads {
  JOIN: Record<string, never>;
  NOTE_TOGGLED: { trackIndex: number; stepIndex: number; active: boolean };
  BPM_CHANGED: { bpm: number };
}

export type CollaborationMessageType = keyof CollaborationPayloads;

export type CollaborationMessage = {
  [K in CollaborationMessageType]: {
    sender?: string;
    type: K;
    projectId: string;
    deviceId: string;
    payload: CollaborationPayloads[K];
  }
}[CollaborationMessageType];

export interface Track {
  id?: number;
  name: string;
  url: string | undefined;
  isMuted: boolean;
  isCustom?: boolean;
}

export interface BackingLoop {
  name: string;
  url: string;
  isMuted: boolean;
}
