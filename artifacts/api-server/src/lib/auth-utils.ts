import * as crypto from 'crypto';

export function hashPassword(password: string): string {
  return crypto
    .pbkdf2Sync(password, process.env.JWT_SECRET || 'default-salt', 100000, 64, 'sha512')
    .toString('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  const newHash = hashPassword(password);
  return newHash === hash;
}

export function generateToken(data: any): string {
  // Simple JWT-like token (in production, use a proper JWT library)
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(JSON.stringify(data)).toString('base64');
  const signature = crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'default-secret')
    .update(header + '.' + payload)
    .digest('base64');
  
  return `${header}.${payload}.${signature}`;
}

export function verifyToken(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid token format');

    const [headerB64, payloadB64, signatureB64] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.JWT_SECRET || 'default-secret')
      .update(headerB64 + '.' + payloadB64)
      .digest('base64');

    if (signatureB64 !== expectedSignature) {
      throw new Error('Invalid token signature');
    }

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
    return payload;
  } catch (error) {
    return null;
  }
}

export function generateUniqueUsername(displayName: string): string {
  // Sanitize display name: remove spaces, special chars, keep only alphanumeric
  const baseName = displayName
    .toLowerCase()
    .replace(/\s+/g, '') // Remove spaces
    .replace(/[^a-z0-9]/g, '') // Remove special chars
    .slice(0, 15); // Max 15 chars

  if (!baseName) {
    // If name is empty after sanitization, use random
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Generate shuffled suffix: mix of numbers and letters
  const suffixChars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += suffixChars.charAt(Math.floor(Math.random() * suffixChars.length));
  }

  return `${baseName}${suffix}`;
}

export async function findAvailableUsername(
  baseUsername: string,
  usersCollection: any
): Promise<string> {
  let username = baseUsername;
  let counter = 0;
  const maxAttempts = 10;

  while (counter < maxAttempts) {
    const existingUser = await usersCollection.findOne({ username });
    if (!existingUser) {
      return username; // Username is available
    }

    // Username taken, shuffle again
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let newSuffix = '';
    for (let i = 0; i < 6; i++) {
      newSuffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    username = `${baseUsername.slice(0, 15)}${newSuffix}`;
    counter++;
  }

  // Fallback: use timestamp if all attempts fail
  return `${baseUsername}${Date.now()}`;
}
