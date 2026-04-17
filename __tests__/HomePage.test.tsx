import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import Home from '../app/page';
import fs from 'fs';
import path from 'path';

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
