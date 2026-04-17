import fs from 'node:fs';
import path from 'node:path';
import Sequencer from './Sequencer';

import { Library } from '../types';

// Server-side library initialization
function getSampleLibrary() {
  const samplesDir = path.join(process.cwd(), 'public', 'samples');
  const library: Library = {
    Kick: [],
    Snare: [],
    'Hi-Hat': [],
    Clap: [],
  };

  if (fs.existsSync(samplesDir)) {
    const items = fs.readdirSync(samplesDir, { withFileTypes: true });

    for (const item of items) {
      if (item.isDirectory()) {
        const folderName = item.name.toLowerCase();
        let category = '';

        if (folderName.includes('kick')) category = 'Kick';
        else if (folderName.includes('snare')) category = 'Snare';
        else if (folderName.includes('hat')) category = 'Hi-Hat';
        else if (folderName.includes('clap')) category = 'Clap';

        if (category) {
          const files = fs.readdirSync(path.join(samplesDir, item.name));
          for (const file of files) {
            if (/\.(wav|mp3|aif)$/i.test(file)) {
              library[category].push({
                name: file,
                url: `/samples/${item.name}/${file}`,
              });
            }
          }
        }
      }
    }
  }
  return library;
}

export default function Home() {
  const sampleLibrary = getSampleLibrary();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-black">
      <div className="w-full flex justify-center">
        <Sequencer initialLibrary={sampleLibrary} />
      </div>
    </main>
  );
}
