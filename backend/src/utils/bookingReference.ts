import { randomInt } from 'node:crypto';

// Short 6-character confirmation code (like an airline PNR). Excludes 0/O
// and 1/I to avoid phone-support confusion ("is that oh or zero?").
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateBookingReference(): string {
  let ref = '';
  for (let i = 0; i < 6; i++) {
    ref += ALPHABET[randomInt(ALPHABET.length)];
  }
  return ref;
}
