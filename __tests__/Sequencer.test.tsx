import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

vi.mock('tone', () => {
  const Player = vi.fn().mockImplementation(function () {
    return {
      toDestination: vi.fn().mockReturnThis(),
      start: vi.fn(),
      stop: vi.fn(),
      dispose: vi.fn(),
      load: vi.fn().mockResolvedValue(),
      mute: false,
      loaded: true,
      buffer: { duration: 0 },
    };
  });

  const Sequence = vi.fn().mockImplementation(function () {
    return {
      start: vi.fn(),
      dispose: vi.fn(),
    };
  });

  return {
    Player,
    Sequence,
    Transport: {
      start: vi.fn(),
      stop: vi.fn(),
      bpm: { value: 120 },
      loop: false,
      loopStart: 0,
      loopEnd: 0,
    },
    now: vi.fn(() => 0),
    context: {
      state: 'running',
      resume: vi.fn().mockResolvedValue(),
    },
    start: vi.fn().mockResolvedValue(),
  };
});

import Sequencer from '../app/Sequencer';
import { Library } from '../types';

test('Sequencer renders with initial library', () => {
  const mockLibrary: Library = {
    Kick: [{ name: 'kick.wav', url: '/samples/kick/kick.wav' }],
    Snare: [],
    'Hi-Hat': [],
    Clap: [],
  };
  render(<Sequencer initialLibrary={mockLibrary} />);
  // The component should render a canvas element
  const canvas = screen.getByTestId('sequencer-canvas');
  // If the component uses a canvas with data-testid="sequencer-canvas"
  expect(canvas).toBeInTheDocument();
});
