import * as readline from 'readline';

export async function readStdinJson<T>(): Promise<T | null> {
  return new Promise((resolve) => {
    let input = '';
    const timeout = setTimeout(() => resolve(null), 1000);
    const rl = readline.createInterface({ input: process.stdin });

    rl.on('line', (line) => {
      input += line;
    });

    rl.on('close', () => {
      clearTimeout(timeout);
      try {
        resolve(JSON.parse(input) as T);
      } catch {
        resolve(null);
      }
    });
  });
}
