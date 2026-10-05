// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

import * as bip39 from "bip39";
import bs58 from "bs58";
import type { MnemonicValidation } from "../types";

export const VALID_MNEMONIC_LENGTHS = [12, 15, 18, 21, 24] as const;

export function normalizePrivateKey(key: string): string {
  return key.startsWith("0x") ? key.slice(2) : key;
}

export function isValidHexKey(key: string): boolean {
  const normalized = normalizePrivateKey(key);
  return /^[a-fA-F0-9]{64}$/.test(normalized);
}

export function isValidBase58Key(key: string): boolean {
  try {
    const decoded = bs58.decode(key);
    return decoded.length === 64 || decoded.length === 32;
  } catch {
    return false;
  }
}

/**
 * Check if input is a Bitcoin WIF (Wallet Import Format) key.
 * - Mainnet compressed: starts with K or L (52 chars)
 * - Mainnet uncompressed: starts with 5 (51 chars)
 * This does a quick format check; actual validation happens during derivation.
 */
export function isValidWIFKey(key: string): boolean {
  // Quick format check - WIF mainnet keys start with 5, K, or L
  // Compressed (K/L): 52 characters
  // Uncompressed (5): 51 characters
  if (!/^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$/.test(key)) {
    return false;
  }
  
  try {
    // Verify base58 decoding works and length is correct
    const decoded = bs58.decode(key);
    // WIF is 37 bytes (uncompressed) or 38 bytes (compressed)
    // Note: This doesn't verify checksum, but derivation will catch invalid keys
    return decoded.length === 37 || decoded.length === 38;
  } catch {
    return false;
  }
}

/**
 * Check if input is a byte array (Solana keypair format).
 * Accepts multiple formats:
 * - JSON: [12,87,203,44,...]
 * - With spaces: [12, 87, 203, 44, ...]
 * - Space-separated: [12 87 203 44 ...]
 * - Mixed: [12, 87 203,44 ...]
 */
export function isValidJsonByteArray(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    return false;
  }
  
  try {
    // Extract content between brackets
    const content = trimmed.slice(1, -1).trim();
    if (!content) return false;
    
    // Split by comma or space (or both)
    const numbers = content
      .split(/[\s,]+/)
      .filter(s => s.length > 0)
      .map(s => parseInt(s.trim(), 10));
    
    if (numbers.length !== 64 && numbers.length !== 32) return false;
    return numbers.every(n => !isNaN(n) && n >= 0 && n <= 255);
  } catch {
    return false;
  }
}

/**
 * Parse byte array string to Uint8Array
 * Handles JSON format, space-separated, and mixed formats
 */
export function parseJsonByteArray(input: string): Uint8Array {
  const trimmed = input.trim();
  const content = trimmed.slice(1, -1).trim();
  
  // Split by comma or space (or both)
  const numbers = content
    .split(/[\s,]+/)
    .filter(s => s.length > 0)
    .map(s => parseInt(s.trim(), 10));
  
  return new Uint8Array(numbers);
}

export function validateMnemonic(phrase: string): MnemonicValidation {
  const words = phrase.trim().toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  
  if (!VALID_MNEMONIC_LENGTHS.includes(wordCount as any)) {
    const validLengths = VALID_MNEMONIC_LENGTHS.join(", ");
    if (wordCount < 12) {
      return {
        valid: false,
        wordCount,
        error: `Too few words: got ${wordCount}, need at least 12. Valid lengths: ${validLengths}`,
      };
    } else if (wordCount > 24) {
      return {
        valid: false,
        wordCount,
        error: `Too many words: got ${wordCount}, maximum is 24. Valid lengths: ${validLengths}`,
      };
    } else {
      return {
        valid: false,
        wordCount,
        error: `Invalid word count: ${wordCount}. Valid lengths: ${validLengths}`,
      };
    }
  }
  
  const normalized = phrase.trim().toLowerCase();
  if (!bip39.validateMnemonic(normalized)) {
    return {
      valid: false,
      wordCount,
      error: `Invalid mnemonic: words may not be in BIP39 wordlist or checksum is incorrect`,
    };
  }
  
  return { valid: true, wordCount };
}

export function isValidMnemonic(phrase: string): boolean {
  return validateMnemonic(phrase).valid;
}

export type InputType = "mnemonic" | "hex" | "base58" | "wif" | "json_array" | "unknown";

export function detectInputType(input: string): InputType {
  const trimmed = input.trim();
  
  // Check for JSON byte array first (Solana format)
  if (isValidJsonByteArray(trimmed)) return "json_array";
  
  // Check for mnemonic (multiple words)
  const words = trimmed.split(/\s+/).filter(w => w.length > 0);
  if (words.length >= 3) {
    if (isValidMnemonic(input)) return "mnemonic";
    return "unknown";
  }
  
  // Check for WIF (Bitcoin private key format)
  if (isValidWIFKey(trimmed)) return "wif";
  
  // Check for hex private key
  if (isValidHexKey(trimmed)) return "hex";
  
  // Check for base58 (Solana keypair)
  if (isValidBase58Key(trimmed)) return "base58";
  
  return "unknown";
}
