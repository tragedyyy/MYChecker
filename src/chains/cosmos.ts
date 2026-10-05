// ═══════════════════════════════════════════════════════════════════════════════
// COSMOS ECOSYSTEM CHAIN DERIVATION
// ═══════════════════════════════════════════════════════════════════════════════

import * as bip39 from "bip39";
import { HDKey } from "@scure/bip32";
import { sha256, ripemd160 } from "@cosmjs/crypto";
import { toBech32 } from "@cosmjs/encoding";
import * as ecc from "tiny-secp256k1";

/**
 * Derive Cosmos address from a hex private key
 * Cosmos uses secp256k1, same as EVM/Bitcoin
 */
export function deriveCosmosAddress(privateKeyHex: string): string {
  const normalized = privateKeyHex.startsWith("0x") ? privateKeyHex.slice(2) : privateKeyHex;
  const privateKeyBytes = Buffer.from(normalized, "hex");
  
  // Get compressed public key using tiny-secp256k1
  const publicKey = ecc.pointFromScalar(privateKeyBytes, true);
  if (!publicKey) {
    throw new Error("Invalid private key for Cosmos");
  }
  
  // Cosmos address: SHA256 -> RIPEMD160 -> bech32
  const pubKeyHash = ripemd160(sha256(new Uint8Array(publicKey)));
  return toBech32("cosmos", pubKeyHash);
}

export function deriveCosmosFromMnemonic(
  mnemonic: string,
  path: string,
  accountIndex: number = 0
): { privateKey: string; address: string } {
  const derivationPath = path.replace(/\/0\/0$/, `/0/${accountIndex}`);
  const seed = bip39.mnemonicToSeedSync(mnemonic.trim().toLowerCase());
  const hdKey = HDKey.fromMasterSeed(seed);
  const child = hdKey.derive(derivationPath);

  if (!child.privateKey || !child.publicKey) {
    throw new Error("Failed to derive Cosmos key");
  }

  // Cosmos uses compressed secp256k1 pubkey -> SHA256 -> RIPEMD160 -> bech32
  const pubKeyHash = ripemd160(sha256(new Uint8Array(child.publicKey)));
  const address = toBech32("cosmos", pubKeyHash);

  return { 
    privateKey: Buffer.from(child.privateKey).toString("hex"), 
    address 
  };
}
