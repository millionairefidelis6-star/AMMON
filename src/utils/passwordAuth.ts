export interface PasswordStrengthResult {
  valid: boolean;
  checks: {
    length: boolean;
    upper: boolean;
    lower: boolean;
    number: boolean;
    special: boolean;
  };
  message: string;
}

export function validateStrongPassword(password: string): PasswordStrengthResult {
  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const valid =
    checks.length && checks.upper && checks.lower && checks.number && checks.special;

  let message = '';
  if (!checks.length) {
    message = 'Password must be at least 8 characters long.';
  } else if (!checks.upper) {
    message = 'Password must include at least one uppercase letter (A–Z).';
  } else if (!checks.lower) {
    message = 'Password must include at least one lowercase letter (a–z).';
  } else if (!checks.number) {
    message = 'Password must include at least one number (0–9).';
  } else if (!checks.special) {
    message = 'Password must include at least one special character (e.g. !@#$%^&*).';
  }

  return { valid, checks, message };
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return bytesToHex(new Uint8Array(digest));
}

export function generateSaltHex(lengthBytes = 16): string {
  const buf = new Uint8Array(lengthBytes);
  crypto.getRandomValues(buf);
  return bytesToHex(buf);
}

export async function hashMemberPasswordClient(
  password: string,
  salt?: string
): Promise<{ hash: string; salt: string }> {
  const actualSalt = salt || generateSaltHex(16);
  const digest = await sha256Hex(`${actualSalt}::${password}`);
  return { hash: `sha256:${digest}`, salt: actualSalt };
}

export async function verifyMemberPasswordClient(
  password: string,
  storedHash?: string,
  storedSalt?: string
): Promise<boolean> {
  if (!password || !storedHash || !storedSalt) return false;
  if (!storedHash.startsWith('sha256:')) return false;
  const expected = `sha256:${await sha256Hex(`${storedSalt}::${password}`)}`;
  if (expected.length !== storedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return diff === 0;
}

export async function hashOtpClient(
  otp: string,
  email: string,
  salt: string
): Promise<string> {
  const digest = await sha256Hex(`${salt}::${email.trim().toLowerCase()}::${otp.trim()}`);
  return `sha256:${digest}`;
}
