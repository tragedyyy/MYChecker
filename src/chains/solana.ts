// ═══════════════════════════════════════════════════════════════════════════════
// SOLANA CHAIN DERIVATION
// ═══════════════════════════════════════════════════════════════════════════════

import { Keypair } from "@solana/web3.js";
import { derivePath } from "ed25519-hd-key";
import * as bip39 from "bip39";
import bs58 from "bs58";
import { isValidBase58Key, isValidJsonByteArray, parseJsonByteArray } from "../utils/validation";

/**
 * Derives Solana address from a valid Solana keypair.
 * Accepts:
 * - Base58-encoded keypair (64 bytes) or seed (32 bytes)
 * - JSON byte array: [12, 87, 203, ...] with 64 or 32 elements
 * Does NOT accept hex private keys - Solana uses ed25519, not secp256k1.
 */
export function deriveSolanaAddress(privateKey: string): string {
  let secretKey: Uint8Array;

  // Try JSON byte array format first: [12, 87, 203, ...]
  if (isValidJsonByteArray(privateKey)) {
    secretKey = parseJsonByteArray(privateKey);
  }
  // Try base58 format
  else if (isValidBase58Key(privateKey)) {
    secretKey = bs58.decode(privateKey);
  }
  else {
    throw new Error(
      "Invalid Solana private key. Accepted formats:\n" +
      "  - Base58 keypair (64 bytes): e.g., 5K1gJ8H...\n" +
      "  - JSON byte array: [12, 87, 203, 44, ...] (64 or 32 elements)\n" +
      "Hex keys (EVM-style) are NOT valid for Solana."
    );
  }
  
  // Solana secret keys are 64 bytes (32 private + 32 public)
  if (secretKey.length === 64) {
    const keypair = Keypair.fromSecretKey(secretKey);
    return keypair.publicKey.toBase58();
  }
  
  // 32 bytes is a seed
  if (secretKey.length === 32) {
    const keypair = Keypair.fromSeed(secretKey);
    return keypair.publicKey.toBase58();
  }

  throw new Error(`Invalid Solana key length: ${secretKey.length} bytes. Expected 64 (keypair) or 32 (seed).`);
}

export function deriveSolanaFromMnemonic(
  mnemonic: string, 
  path: string, 
  accountIndex: number = 0
): { privateKey: string; address: string } {
  let derivationPath = path;
  if (path === "m/44'/501'/0'/0'") {
    derivationPath = `m/44'/501'/${accountIndex}'/0'`;
  } else if (path === "m/44'/501'/0'") {
    derivationPath = `m/44'/501'/${accountIndex}'`;
  } else if (path === "m/44'/501'") {
    derivationPath = `m/44'/501'/${accountIndex}'`;
  }

  const seed = bip39.mnemonicToSeedSync(mnemonic.trim().toLowerCase());
  const derived = derivePath(derivationPath, seed.toString("hex"));
  
  const keypair = Keypair.fromSeed(Uint8Array.from(derived.key));
  
  return {
    privateKey: bs58.encode(keypair.secretKey),
    address: keypair.publicKey.toBase58(),
  };
}
