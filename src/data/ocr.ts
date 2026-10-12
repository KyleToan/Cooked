// Reads the text on a receipt photo on the phone (Google ML Kit text recognition),
// then puts it back into rows so parseReceipt sees "MILK 2% 1GAL   3.49" on one line.

import type { Text, TextLine } from '@infinitered/react-native-mlkit-text-recognition';
import { requireOptionalNativeModule } from 'expo';

import { SAMPLE_SCAN } from './seed';
import type { ScanLine } from './types';

// The package's own import throws where its native code isn't built in (Expo Go, web), so look the module up optionally.
const native = requireOptionalNativeModule<{ recognizeText(uri: string): Promise<Text> }>('RNMLKitTextRecognition');

/** The lines the last scan read, handed from Scan to Check your scan. */
export const lastScan: { lines: ScanLine[] } = { lines: SAMPLE_SCAN };

/**
 * The receipt's text, one printed row per line, or null when this build can't
 * read photos (Expo Go, web). Throws when reading fails.
 */
export async function readReceiptText(uri: string): Promise<string | null> {
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
