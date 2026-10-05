// ═══════════════════════════════════════════════════════════════════════════════
// BITCOIN FAMILY CHAIN DERIVATION
// ═══════════════════════════════════════════════════════════════════════════════

import * as bip39 from "bip39";
import * as bitcoin from "bitcoinjs-lib";
import { HDKey } from "@scure/bip32";
import * as ecc from "tiny-secp256k1";
import ECPairFactory from "ecpair";
import { normalizePrivateKey } from "../utils/validation";

// Initialize bitcoinjs-lib with secp256k1
bitcoin.initEccLib(ecc);
const ECPair = ECPairFactory(ecc);

// Litecoin network params
export const litecoinNetwork = {
  messagePrefix: '\x19Litecoin Signed Message:\n',
  bech32: 'ltc',
  bip32: { public: 0x019da462, private: 0x019d9cfe },
  pubKeyHash: 0x30,
  scriptHash: 0x32,
  wif: 0xb0,
};

// Dogecoin network params
export const dogecoinNetwork = {
  messagePrefix: '\x19Dogecoin Signed Message:\n',
  bech32: 'doge',
  bip32: { public: 0x02facafd, private: 0x02fac398 },
  pubKeyHash: 0x1e,
  scriptHash: 0x16,
  wif: 0x9e,
};

/**
 * Validates if a string is a valid Bitcoin WIF (Wallet Import Format) private key.
 * WIF keys start with 5 (uncompressed), K or L (compressed) for mainnet.
 */
export function isValidWIF(key: string): boolean {
  try {
    ECPair.fromWIF(key, bitcoin.networks.bitcoin);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates if a string is a valid hex private key (64 hex characters).
 */
function isValidHex(key: string): boolean {
  const normalized = key.startsWith("0x") ? key.slice(2) : key;
  return /^[a-fA-F0-9]{64}$/.test(normalized);
}

/**
 * Derives Bitcoin address from a private key.
 * Accepts:
 * - WIF format (5xxx, Kxxx, Lxxx for mainnet)
 * - Raw hex (64 characters)
 * Returns Native SegWit (bc1q...) for compressed keys, Legacy (1...) for uncompressed.
 */
export function deriveBitcoinAddress(privateKey: string): string {
  let keyPair;
  
  // Try WIF format first
  if (isValidWIF(privateKey)) {
    keyPair = ECPair.fromWIF(privateKey, bitcoin.networks.bitcoin);
  } 
  // Try raw hex format
  else if (isValidHex(privateKey)) {
    const normalized = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
    keyPair = ECPair.fromPrivateKey(Buffer.from(normalized, "hex"), {
      network: bitcoin.networks.bitcoin,
    });
  } 
  else {
    throw new Error(
      "Invalid Bitcoin private key. Accepted formats:\n" +
      "  - WIF: starts with 5, K, or L (e.g., L5BmPijJjrKbiUfG4...)\n" +
      "  - Hex: 64 hex characters (e.g., 1E99423A4ED27608...)"
    );
  }
  
  // Check if compressed (33 bytes) or uncompressed (65 bytes)
  const isCompressed = keyPair.publicKey.length === 33;
  
  if (isCompressed) {
    // Return Native SegWit address for compressed keys
    const { address } = bitcoin.payments.p2wpkh({
      pubkey: keyPair.publicKey,
      network: bitcoin.networks.bitcoin,
    });
    return address!;
  } else {
    // Return Legacy address for uncompressed keys
    const { address } = bitcoin.payments.p2pkh({
      pubkey: keyPair.publicKey,
      network: bitcoin.networks.bitcoin,
    });
    return address!;
  }
}

/**
 * Derives all Bitcoin address types from a private key.
 * Returns legacy, segwit, native-segwit, and taproot addresses.
 * Note: Uncompressed keys (WIF starting with 5) only support legacy addresses.
 */
export function deriveBitcoinAddressesAll(privateKey: string): { 
  address: string; 
  type: string; 
}[] {
  let keyPair;
  
  if (isValidWIF(privateKey)) {
    keyPair = ECPair.fromWIF(privateKey, bitcoin.networks.bitcoin);
  } else if (isValidHex(privateKey)) {
    const normalized = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
    keyPair = ECPair.fromPrivateKey(Buffer.from(normalized, "hex"), {
      network: bitcoin.networks.bitcoin,
    });
  } else {
    throw new Error("Invalid Bitcoin private key format");
  }

  const results: { address: string; type: string }[] = [];
  
  // Check if the key is compressed (33 bytes) or uncompressed (65 bytes)
  const isCompressed = keyPair.publicKey.length === 33;

  // Legacy (1...) - works with both compressed and uncompressed
  const p2pkh = bitcoin.payments.p2pkh({
    pubkey: keyPair.publicKey,
    network: bitcoin.networks.bitcoin,
  });
  results.push({ address: p2pkh.address!, type: "legacy" });

  // SegWit addresses only work with compressed public keys
  if (isCompressed) {
    // Native SegWit (bc1q...)
    const p2wpkh = bitcoin.payments.p2wpkh({
      pubkey: keyPair.publicKey,
      network: bitcoin.networks.bitcoin,
    });
    results.push({ address: p2wpkh.address!, type: "native-segwit" });

    // SegWit (3...)
    const p2sh = bitcoin.payments.p2sh({
      redeem: bitcoin.payments.p2wpkh({
        pubkey: keyPair.publicKey,
        network: bitcoin.networks.bitcoin,
      }),
      network: bitcoin.networks.bitcoin,
    });
    results.push({ address: p2sh.address!, type: "segwit" });

    // Taproot (bc1p...) - requires x-only pubkey
    try {
      const xOnlyPubkey = keyPair.publicKey.slice(1);
      const p2tr = bitcoin.payments.p2tr({
        internalPubkey: xOnlyPubkey,
        network: bitcoin.networks.bitcoin,
      });
      if (p2tr.address) {
        results.push({ address: p2tr.address, type: "taproot" });
      }
    } catch {
      // Taproot may fail for some keys
    }
  }

  return results;
}

export function deriveBitcoinFromMnemonic(
  mnemonic: string, 
  path: string, 
  accountIndex: number = 0
): { privateKey: string; address: string; addressType: string } {
  const derivationPath = path.replace(/\/0\/0$/, `/0/${accountIndex}`);
  
  const seed = bip39.mnemonicToSeedSync(mnemonic.trim().toLowerCase());
  const hdKey = HDKey.fromMasterSeed(seed);
  const child = hdKey.derive(derivationPath);
  
  if (!child.privateKey || !child.publicKey) {
    throw new Error("Failed to derive Bitcoin key");
  }

  const privateKeyWIF = ECPair.fromPrivateKey(Buffer.from(child.privateKey), {
    network: bitcoin.networks.bitcoin,
  }).toWIF();

  let address: string;
  let addressType: string;

  if (path.startsWith("m/84'")) {
    const { address: addr } = bitcoin.payments.p2wpkh({
      pubkey: Buffer.from(child.publicKey),
      network: bitcoin.networks.bitcoin,
    });
    address = addr!;
    addressType = "native-segwit";
  } else if (path.startsWith("m/49'")) {
    const { address: addr } = bitcoin.payments.p2sh({
      redeem: bitcoin.payments.p2wpkh({
        pubkey: Buffer.from(child.publicKey),
        network: bitcoin.networks.bitcoin,
      }),
      network: bitcoin.networks.bitcoin,
    });
    address = addr!;
    addressType = "segwit";
  } else if (path.startsWith("m/86'")) {
    const xOnlyPubkey = child.publicKey.slice(1);
    const { address: addr } = bitcoin.payments.p2tr({
      internalPubkey: Buffer.from(xOnlyPubkey),
      network: bitcoin.networks.bitcoin,
    });
    address = addr!;
    addressType = "taproot";
  } else {
    const { address: addr } = bitcoin.payments.p2pkh({
      pubkey: Buffer.from(child.publicKey),
      network: bitcoin.networks.bitcoin,
    });
    address = addr!;
    addressType = "legacy";
  }

  return { privateKey: privateKeyWIF, address, addressType };
}

export function deriveLitecoinFromMnemonic(
  mnemonic: string,
  path: string,
  accountIndex: number = 0
): { privateKey: string; address: string; addressType: string } {
  const derivationPath = path.replace(/\/0\/0$/, `/0/${accountIndex}`);
  const seed = bip39.mnemonicToSeedSync(mnemonic.trim().toLowerCase());
  const hdKey = HDKey.fromMasterSeed(seed);
  const child = hdKey.derive(derivationPath);

  if (!child.privateKey || !child.publicKey) {
    throw new Error("Failed to derive Litecoin key");
  }

  let address: string;
  let addressType: string;

  if (path.startsWith("m/84'")) {
    const { address: addr } = bitcoin.payments.p2wpkh({
      pubkey: Buffer.from(child.publicKey),
      network: litecoinNetwork as any,
    });
    address = addr!;
    addressType = "native-segwit";
  } else {
    const { address: addr } = bitcoin.payments.p2pkh({
      pubkey: Buffer.from(child.publicKey),
      network: litecoinNetwork as any,
    });
    address = addr!;
    addressType = "legacy";
  }

  return { 
    privateKey: Buffer.from(child.privateKey).toString("hex"), 
    address, 
    addressType 
  };
}

export function deriveDogecoinFromMnemonic(
  mnemonic: string,
  path: string,
  accountIndex: number = 0
): { privateKey: string; address: string } {
  const derivationPath = path.replace(/\/0\/0$/, `/0/${accountIndex}`);
  const seed = bip39.mnemonicToSeedSync(mnemonic.trim().toLowerCase());
  const hdKey = HDKey.fromMasterSeed(seed);
  const child = hdKey.derive(derivationPath);

  if (!child.privateKey || !child.publicKey) {
    throw new Error("Failed to derive Dogecoin key");
  }

  const { address } = bitcoin.payments.p2pkh({
    pubkey: Buffer.from(child.publicKey),
    network: dogecoinNetwork as any,
  });

  return { 
    privateKey: Buffer.from(child.privateKey).toString("hex"), 
    address: address! 
  };
}
