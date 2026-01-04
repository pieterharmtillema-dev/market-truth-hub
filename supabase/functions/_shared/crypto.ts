/**
 * Cryptographic utilities for secure token storage
 *
 * This module provides AES-256-GCM encryption for OAuth tokens (TradeStation)
 * and maintains the legacy XOR encryption for existing exchange API keys.
 */

/**
 * Encrypts plaintext using AES-256-GCM with PBKDF2 key derivation
 *
 * Security features:
 * - AES-256-GCM authenticated encryption
 * - PBKDF2 key derivation with 100,000 iterations
 * - Random 16-byte salt per encryption
 * - Random 12-byte IV per encryption
 * - Includes authentication tag for integrity
 *
 * @param plaintext - The text to encrypt (e.g., OAuth access token)
 * @param masterKey - The master encryption key from environment variable
 * @returns Base64-encoded encrypted data: salt(16) + iv(12) + ciphertext + authTag(16)
 */
export async function encryptToken(
  plaintext: string,
  masterKey: string
): Promise<string> {
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(plaintext);

  // Generate random salt for key derivation
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Import master key for PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(masterKey),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive encryption key using PBKDF2
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt with AES-256-GCM
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintextBytes
  );

  // Pack: salt (16 bytes) + iv (12 bytes) + ciphertext + auth tag (16 bytes, included in ciphertext)
  const encrypted = new Uint8Array(
    salt.length + iv.length + ciphertext.byteLength
  );
  encrypted.set(salt, 0);
  encrypted.set(iv, salt.length);
  encrypted.set(new Uint8Array(ciphertext), salt.length + iv.length);

  // Return base64-encoded
  return btoa(String.fromCharCode(...encrypted));
}

/**
 * Decrypts AES-256-GCM encrypted token
 *
 * @param encrypted - Base64-encoded encrypted data
 * @param masterKey - The master encryption key (must match encryption key)
 * @returns Decrypted plaintext
 * @throws Error if decryption fails (wrong key, tampered data, etc.)
 */
export async function decryptToken(
  encrypted: string,
  masterKey: string
): Promise<string> {
  const encoder = new TextEncoder();

  // Decode from base64
  const encryptedBytes = Uint8Array.from(atob(encrypted), (c) =>
    c.charCodeAt(0)
  );

  // Unpack: salt (16) + iv (12) + ciphertext
  const salt = encryptedBytes.slice(0, 16);
  const iv = encryptedBytes.slice(16, 28);
  const ciphertext = encryptedBytes.slice(28);

  // Import master key
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(masterKey),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive decryption key (must use same parameters as encryption)
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  // Decrypt
  try {
    const plaintextBytes = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(plaintextBytes);
  } catch (error) {
    throw new Error(
      'Decryption failed: Invalid key, corrupted data, or tampered ciphertext'
    );
  }
}

/**
 * Legacy XOR encryption for existing exchange API keys (Binance, Bitvavo, Coinbase)
 *
 * NOTE: This is a simple XOR cipher and should only be used for backward compatibility.
 * New integrations should use encryptToken/decryptToken (AES-256-GCM).
 *
 * @param text - The text to encrypt
 * @param key - The encryption key
 * @returns Base64-encoded encrypted text
 */
export function encryptCredentialXOR(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return btoa(result);
}

/**
 * Legacy XOR decryption for existing exchange API keys
 *
 * @param encrypted - Base64-encoded encrypted text
 * @param key - The encryption key (must match encryption key)
 * @returns Decrypted plaintext
 */
export function decryptCredentialXOR(encrypted: string, key: string): string {
  const decoded = atob(encrypted);
  let result = '';
  for (let i = 0; i < decoded.length; i++) {
    result += String.fromCharCode(
      decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return result;
}

/**
 * Generates a cryptographically secure random state parameter for OAuth
 *
 * @returns Base64url-encoded random 32-byte state (43 characters)
 */
export function generateOAuthState(): string {
  const stateBytes = crypto.getRandomValues(new Uint8Array(32));

  // Convert to base64url (URL-safe base64 without padding)
  const base64 = btoa(String.fromCharCode(...stateBytes));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Helper function to convert Uint8Array to base64url
 */
export function base64UrlEncode(bytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
