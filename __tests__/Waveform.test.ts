/* eslint-disable @typescript-eslint/no-explicit-any */
import { drawWaveform } from '../utils/waveform';

test('drawWaveform runs without throwing errors', () => {
  // Create a fake canvas element (jsdom provides it)
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 100;

  // Create a minimal ToneAudioBuffer mock
  const mockBuffer = {
    getChannelData: () =>
      new Float32Array(44100).map(() => Math.random() * 2 - 1),
  } as any;

  expect(() => drawWaveform(canvas, mockBuffer)).not.toThrow();
});
