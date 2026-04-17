import { render, screen } from '@testing-library/react';
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
  const canvas =
    screen.getByRole('img', { hidden: true }) ||
    screen.getByTestId('sequencer-canvas');
  // If the component uses a canvas with data-testid="sequencer-canvas"
  expect(canvas).toBeInTheDocument();
});
