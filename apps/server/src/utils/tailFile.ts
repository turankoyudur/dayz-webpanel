/**
 * utils/tailFile.ts
 *
 * Reads the last N lines of a text file.
 *
 * Why:
 * - DayZ / BattlEye logs can get large.
 * - The UI usually wants the newest lines ("tail").
 *
 * This implementation is intentionally simple and robust:
 * - It reads up to `maxBytes` from the end and then extracts the last N lines.
 * - If the file is smaller than maxBytes, it reads the whole file.
 */

import fs from 'node:fs/promises';

export async function tailFile(filePath: string, lines: number, maxBytes = 512 * 1024): Promise<string[]> {
  const st = await fs.stat(filePath);
  const fileSize = st.size;

  const readSize = Math.min(maxBytes, fileSize);
  const start = Math.max(0, fileSize - readSize);

  const fh = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(readSize);
    await fh.read(buffer, 0, readSize, start);
    const text = buffer.toString('utf8');

    // Split into lines. Works for Windows CRLF and Linux LF.
    const all = text.replace(/\r\n/g, '\n').split('\n');

    // If we read from middle of a line, drop the first partial line.
    if (start > 0 && all.length > 0) {
      all.shift();
    }

    return all.filter((l) => l.length > 0).slice(-lines);
  } finally {
    await fh.close();
  }
}
