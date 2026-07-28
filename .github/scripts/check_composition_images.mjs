import { access, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const seasons = {
  season1: [
    'alutemu',
    'arekkusu',
    'gyan',
    'jp',
    'matsuri',
    'seseisei',
    'thundurus',
    'yoshiyuki'
  ],
  season2: [
    'alutemu',
    'barrette',
    'gyan',
    'haguren',
    'masa007',
    'matsuri',
    'reverent',
    'thundurus'
  ]
};

const days = [1, 2, 3, 4];
const missing = [];
const empty = [];
const unexpected = [];
let checked = 0;

for (const [season, players] of Object.entries(seasons)) {
  for (const day of days) {
    const directory = path.join('public', season, 'compositions', `day${day}`);
    const expected = new Set(players.map(player => `${player}.webp`));

    for (const player of players) {
      const file = path.join(directory, `${player}.webp`);
      checked += 1;

      try {
        await access(file);
        const details = await stat(file);
        if (!details.isFile() || details.size === 0) empty.push(file);
      } catch {
        missing.push(file);
      }
    }

    try {
      const actual = await readdir(directory);
      for (const file of actual) {
        if (file.endsWith('.webp') && !expected.has(file)) {
          unexpected.push(path.join(directory, file));
        }
      }
    } catch {
      // Missing directories are already represented by the expected-file errors.
    }
  }
}

console.log(`Checked ${checked} expected composition images.`);

if (unexpected.length) {
  console.warn('\nUnexpected WebP files:');
  unexpected.forEach(file => console.warn(`- ${file}`));
}

if (missing.length || empty.length) {
  if (missing.length) {
    console.error('\nMissing composition images:');
    missing.forEach(file => console.error(`- ${file}`));
  }

  if (empty.length) {
    console.error('\nEmpty composition images:');
    empty.forEach(file => console.error(`- ${file}`));
  }

  process.exitCode = 1;
} else {
  console.log('All expected composition images are present and non-empty.');
}
