import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import Home from '../app/page';
import fs from 'fs';
import path from 'path';

vi.mock('tone', () => {
  const Player = vi.fn().mockImplementation(function () {
    return {
      toDestination: vi.fn().mockReturnThis(),
      start: vi.fn(),
      stop: vi.fn(),
      dispose: vi.fn(),
      load: vi.fn().mockResolvedValue(undefined),
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
      resume: vi.fn().mockResolvedValue(undefined),
    },
    start: vi.fn().mockResolvedValue(undefined),
  };
});

// Mock the filesystem to simulate sample directories
vi.mock('fs');
vi.mock('path');

vi.spyOn(fs, 'existsSync').mockReturnValue(true);
/* eslint-disable @typescript-eslint/no-explicit-any */
vi.spyOn(fs, 'readdirSync')
  .mockImplementationOnce(
    () =>
      [
        { name: 'kick', isDirectory: () => true },
        { name: 'snare', isDirectory: () => true },
      ] as any
  )
  .mockImplementationOnce(() => ['kick.wav'] as any)
  .mockImplementationOnce(() => ['snare.wav'] as any);
/* eslint-enable @typescript-eslint/no-explicit-any */

vi.spyOn(path, 'join').mockImplementation((...segments) => segments.join('/'));

test('Home page renders Sequencer with a generated library', () => {
  render(<Home />);
  // The Sequencer component renders a canvas with data-testid="sequencer-canvas"

  const canvas = screen.getByTestId('sequencer-canvas');
  expect(canvas).toBeInTheDocument();
});
