// ═══════════════════════════════════════════════════════════════════════════════
// EVM CHAIN DERIVATION
// ═══════════════════════════════════════════════════════════════════════════════

import { Wallet, HDNodeWallet, Mnemonic, sha256 as ethersSha256 } from "ethers";
import bs58 from "bs58";
import { normalizePrivateKey } from "../utils/validation";

export function deriveEVMAddress(privateKey: string): string {
  const wallet = new Wallet("0x" + normalizePrivateKey(privateKey));
  return wallet.address;
}

export function deriveEVMFromMnemonic(
  mnemonic: string, 
  path: string, 
  accountIndex: number = 0
): { privateKey: string; address: string } {
  const derivationPath = path.includes("/0/0") 
    ? path.replace(/\/0\/0$/, `/0/${accountIndex}`)
    : path.replace(/\/0'$/, `/${accountIndex}'`).replace(/\/0$/, `/${accountIndex}`);
  
  const mnemonicObj = Mnemonic.fromPhrase(mnemonic.trim().toLowerCase());
  const hdNode = HDNodeWallet.fromMnemonic(mnemonicObj, derivationPath);
  
  return {
    privateKey: hdNode.privateKey.slice(2),
    address: hdNode.address,
  };
}

export function deriveTronAddress(privateKey: string): string {
  const wallet = new Wallet("0x" + normalizePrivateKey(privateKey));
  const ethAddress = wallet.address;

  const addressBytes = Buffer.from(ethAddress.slice(2), "hex");
  const tronBytes = Buffer.concat([Buffer.from([0x41]), addressBytes]);

  const hash1 = ethersSha256(tronBytes);
  const hash2 = ethersSha256(hash1);
  const checksum = Buffer.from(hash2.slice(2), "hex").slice(0, 4);

  const addressWithChecksum = Buffer.concat([tronBytes, checksum]);
  return bs58.encode(addressWithChecksum);
}

export function deriveTronFromMnemonic(
  mnemonic: string, 
  path: string, 
  accountIndex: number = 0
): { privateKey: string; address: string } {
  const derivationPath = path.includes("/0/0") 
    ? path.replace(/\/0\/0$/, `/0/${accountIndex}`)
    : path.replace(/\/0$/, `/${accountIndex}`);
  
  const mnemonicObj = Mnemonic.fromPhrase(mnemonic.trim().toLowerCase());
  const hdNode = HDNodeWallet.fromMnemonic(mnemonicObj, derivationPath);
  
  const privateKey = hdNode.privateKey.slice(2);
  const tronAddress = deriveTronAddress(privateKey);
  
  return {
    privateKey,
    address: tronAddress,
  };
}
