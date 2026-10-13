// Reads the text on a photo (a receipt or a recipe page) on the phone with Google ML Kit
// text recognition, then puts it back into rows so parseReceipt sees "MILK 2% 1GAL   3.49" on one line.

import type { Text, TextLine } from '@infinitered/react-native-mlkit-text-recognition';
import { requireOptionalNativeModule } from 'expo';

import type { ScanLine } from './types';

// The package's own import throws where its native code isn't built in (Expo Go, web), so look the module up optionally.
const native = requireOptionalNativeModule<{ recognizeText(uri: string): Promise<Text> }>('RNMLKitTextRecognition');

/** What the last scan read: receipt lines, the store's name and when it was taken for Check your scan, recipe text for Import. */
export const lastScan: { lines: ScanLine[]; store: string | null; at: Date; recipeText: string } = {
  // Empty until a photo is read, so Check your scan opened cold has nothing stale to show.
  lines: [],
  store: null,
  at: new Date(),
  recipeText: '',
};

/**
 * The photo's text, one printed row per line, or null when this build can't
 * read photos (Expo Go, web). Throws when reading fails.
 */
export async function readText(uri: string): Promise<string | null> {
  if (!native) return null;
  const result = await native.recognizeText(uri);
  return joinRows(result.blocks.flatMap((b) => b.lines));
}

/**
 * ML Kit splits a receipt into columns (names in one block, prices in another).
 * Lines whose middles sit at the same height are one printed row; join them left to right.
 */
export function joinRows(lines: Pick<TextLine, 'text' | 'frame'>[]): string {
  const mid = (l: Pick<TextLine, 'frame'>) => (l.frame.top + l.frame.bottom) / 2;
  const rows: { mid: number; half: number; lines: Pick<TextLine, 'text' | 'frame'>[] }[] = [];
  for (const line of [...lines].sort((a, b) => mid(a) - mid(b))) {
    const row = rows.find((r) => Math.abs(r.mid - mid(line)) < r.half);
    if (row) row.lines.push(line);
    else rows.push({ mid: mid(line), half: (line.frame.bottom - line.frame.top) / 2, lines: [line] });
  }
  return rows
    .map((r) => r.lines.sort((a, b) => a.frame.left - b.frame.left).map((l) => l.text).join('   '))
    .join('\n');
}
