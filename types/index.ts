export type Sample = { name: string; url: string };
export type Library = Record<string, Sample[]>;

export interface CollaborationMessage {
  sender?: string;
  type: string;
  projectId: string;
  deviceId: string;
  payload: any;
}

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
