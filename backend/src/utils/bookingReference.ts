import { randomInt } from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateBookingReference(): string {
  let ref = '';
  for (let i = 0; i < 6; i++) {
    ref += ALPHABET[randomInt(ALPHABET.length)];
  }
  return ref;
}
