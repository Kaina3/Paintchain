import { randomBytes } from 'crypto';

export function generateRoomId(): string {
  // Generate 6 character alphanumeric ID
  return randomBytes(3)
    .toString('hex')
    .toUpperCase()
    .slice(0, 6);
}

export function generatePlayerId(): string {
  // Generate UUID-like ID
  return randomBytes(16).toString('hex');
}
