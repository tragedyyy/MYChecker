// ═══════════════════════════════════════════════════════════════════════════════
// OTHER CHAIN DERIVATIONS (Aptos, Sui, TON, Near, Polkadot, XRP, Stellar, Cardano)
// ═══════════════════════════════════════════════════════════════════════════════

import * as bip39 from "bip39";
import { derivePath } from "ed25519-hd-key";
import { HDKey } from "@scure/bip32";
import { sha256, ripemd160 } from "@cosmjs/crypto";
import { blake2b } from "@noble/hashes/blake2b";
import { sha3_256 } from "@noble/hashes/sha3";
import { bech32 } from "bech32";
import bs58 from "bs58";
import nacl from "tweetnacl";
import * as StellarBase from "stellar-base";
import { createHmac, pbkdf2Sync } from "crypto";
import { WalletContractV4 } from "@ton/ton";
import { mnemonicToMiniSecret, sr25519PairFromSeed, encodeAddress } from "@polkadot/util-crypto";
import * as CardanoWasm from "@emurgo/cardano-serialization-lib-nodejs";

// Aptos derivation (ed25519)
export function deriveAptosFromMnemonic(
  mnemonic: string,
  path: string,
  accountIndex: number = 0
): { privateKey: string; address: string } {
  const derivationPath = path.replace(/\/0'\/0'$/, `/${accountIndex}'/0'`).replace(/\/0'$/, `/${accountIndex}'`);
  const seed = bip39.mnemonicToSeedSync(mnemonic.trim().toLowerCase());
  const derived = derivePath(derivationPath, seed.toString("hex"));
  
  const keyPair = nacl.sign.keyPair.fromSeed(derived.key);
  
  const hashBuffer = new Uint8Array(33);
  hashBuffer.set(keyPair.publicKey, 0);
  hashBuffer[32] = 0x00; // single-key scheme
  
  const hash = sha3_256(hashBuffer); // Aptos: address = SHA3-256(pubkey || scheme), not SHA-256
  const address = "0x" + Buffer.from(hash).toString("hex");

  return { privateKey: Buffer.from(derived.key).toString("hex"), address };
}

// Sui derivation (ed25519)  
export function deriveSuiFromMnemonic(
  mnemonic: string,
  path: string,
  accountIndex: number = 0
): { privateKey: string; address: string } {
  const derivationPath = path.replace(/\/0'\/0'$/, `/${accountIndex}'/0'`).replace(/\/0'$/, `/${accountIndex}'`);
  const seed = bip39.mnemonicToSeedSync(mnemonic.trim().toLowerCase());
  const derived = derivePath(derivationPath, seed.toString("hex"));
  
  const keyPair = nacl.sign.keyPair.fromSeed(derived.key);
  
  const flaggedKey = new Uint8Array(33);
  flaggedKey[0] = 0x00; // ED25519 flag
  flaggedKey.set(keyPair.publicKey, 1);
  
  const hash = blake2b(flaggedKey, { dkLen: 32 }); // Sui: address = BLAKE2b-256(flag || pubkey), not SHA-256
  const address = "0x" + Buffer.from(hash).toString("hex");

  return { privateKey: Buffer.from(derived.key).toString("hex"), address };
}

// TON derivation - standard Wallet V4R2 contract.
// Key is derived with the TON scheme (HMAC-SHA512 then PBKDF2 100000), NOT BIP44,
// so the path from DERIVATION_PATHS is intentionally unused here.
export function deriveTonFromMnemonic(
  mnemonic: string,
  path: string,
  accountIndex: number = 0
): { privateKey: string; address: string } {
  const words = mnemonic.trim().toLowerCase().split(/\s+/).join(" ");
  const entropy = createHmac("sha512", words).update("").digest();
  const seed = pbkdf2Sync(entropy, "TON default seed", 100000, 64, "sha512");
  const keyPair = nacl.sign.keyPair.fromSeed(new Uint8Array(seed.subarray(0, 32)));

  const wallet = WalletContractV4.create({
    workchain: 0,
    publicKey: Buffer.from(keyPair.publicKey),
  });
  const address = wallet.address.toString({ bounceable: false });

  return { privateKey: Buffer.from(keyPair.secretKey).toString("hex"), address };
}
// Near derivation (ed25519)
export function deriveNearFromMnemonic(
  mnemonic: string,
  path: string,
  accountIndex: number = 0
): { privateKey: string; address: string } {
  const derivationPath = path.replace(/\/0'$/, `/${accountIndex}'`);
  const seed = bip39.mnemonicToSeedSync(mnemonic.trim().toLowerCase());
  const derived = derivePath(derivationPath, seed.toString("hex"));
  
  const keyPair = nacl.sign.keyPair.fromSeed(derived.key);
  
  const address = Buffer.from(keyPair.publicKey).toString("hex");

  return { privateKey: Buffer.from(derived.key).toString("hex"), address };
}

// Polkadot derivation - real sr25519 (Schnorrkel) with proper SS58 encoding.
// The BIP44 path is not used: like Polkadot.js and Talisman, the root account of the
// mnemonic is derived. The previous secp256k1 + hand-made base58 code produced
// addresses that are not valid SS58 and are not controlled by this mnemonic.
export function derivePolkadotFromMnemonic(
  mnemonic: string,
  path: string,
  accountIndex: number = 0
): { privateKey: string; address: string } {
  const miniSecret = mnemonicToMiniSecret(mnemonic.trim().toLowerCase());
  const { publicKey, secretKey } = sr25519PairFromSeed(miniSecret);
  const address = encodeAddress(publicKey, 0); // SS58 encoding, Polkadot prefix

  return { privateKey: Buffer.from(secretKey).toString("hex"), address };
}
// XRP derivation
export function deriveXrpFromMnemonic(
  mnemonic: string,
  path: string,
  accountIndex: number = 0
): { privateKey: string; address: string } {
  const derivationPath = path.replace(/\/0\/0$/, `/0/${accountIndex}`);
  const seed = bip39.mnemonicToSeedSync(mnemonic.trim().toLowerCase());
  const hdKey = HDKey.fromMasterSeed(seed);
  const child = hdKey.derive(derivationPath);

  if (!child.privateKey || !child.publicKey) {
    throw new Error("Failed to derive XRP key");
  }

  const pubKeyHash = ripemd160(sha256(new Uint8Array(child.publicKey)));
  
  const payload = new Uint8Array(21);
  payload[0] = 0x00; // Account ID prefix
  payload.set(pubKeyHash, 1);
  
  const checksum = sha256(sha256(payload)).slice(0, 4);
  const full = new Uint8Array(25);
  full.set(payload, 0);
  full.set(checksum, 21);
  
  const XRP_ALPHABET = 'rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz';
  let address = '';
  let num = BigInt('0x' + Buffer.from(full).toString("hex"));
  while (num > 0n) {
    address = XRP_ALPHABET[Number(num % 58n)] + address;
    num = num / 58n;
  }
  for (const byte of full) {
    if (byte === 0) address = 'r' + address;
    else break;
  }

  return { privateKey: Buffer.from(child.privateKey).toString("hex"), address };
}

// Stellar derivation (ed25519)
export function deriveStellarFromMnemonic(
  mnemonic: string,
  path: string,
  accountIndex: number = 0
): { privateKey: string; address: string } {
  const derivationPath = path.replace(/\/0'$/, `/${accountIndex}'`);
  const seed = bip39.mnemonicToSeedSync(mnemonic.trim().toLowerCase());
  const derived = derivePath(derivationPath, seed.toString("hex"));
  
  const keyPair = StellarBase.Keypair.fromRawEd25519Seed(Buffer.from(derived.key));
  
  return { 
    privateKey: keyPair.secret(),
    address: keyPair.publicKey()
  };
}

// Cardano derivation - CIP-1852 with BIP32-Ed25519 extended keys.
// Address is a base address: header byte (type 0 + mainnet) || blake2b-224(payment key)
// || blake2b-224(stake key), bech32-encoded with the "addr" prefix.
// The earlier code used plain BIP44 + SHA-256 and produced addresses that are not valid.
export function deriveCardanoFromMnemonic(
  mnemonic: string,
  path: string,
  accountIndex: number = 0
): { privateKey: string; address: string } {
  const entropy = bip39.mnemonicToEntropy(mnemonic.trim().toLowerCase());
  const root = CardanoWasm.Bip32PrivateKey.from_bip39_entropy(
    Buffer.from(entropy, "hex"),
    Buffer.alloc(0)
  );

  // CIP-1852: m/1852'/1815'/<account>'
  const account = root
    .derive(1852 + 0x80000000)
    .derive(1815 + 0x80000000)
    .derive(accountIndex + 0x80000000);

  const paymentKey = account.derive(0).derive(0).to_public().to_raw_key();
  const stakeKey = account.derive(2).derive(0).to_public().to_raw_key();

  const address = CardanoWasm.BaseAddress.new(
    1, // mainnet network id
    CardanoWasm.Credential.from_keyhash(paymentKey.hash()),
    CardanoWasm.Credential.from_keyhash(stakeKey.hash())
  )
    .to_address()
    .to_bech32();

  return { privateKey: Buffer.from(account.as_bytes()).toString("hex"), address };
}