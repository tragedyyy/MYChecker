#!/usr/bin/env bun

// ═══════════════════════════════════════════════════════════════════════════════
// CRYPTOCHECKER - Multi-Chain Address & Balance Tool
// ═══════════════════════════════════════════════════════════════════════════════

import { writeFileSync } from "fs";
import { join } from "path";

// Import from src modules
import type { 
  DerivedAddress, 
  MnemonicDerivedKey, 
  BalanceResult, 
  UserConfig,
  ChainType 
} from "./src/types";

import { NETWORKS, DERIVATION_PATHS } from "./src/networks";

import { 
  loadConfig, 
  generateSampleConfig, 
  getCheckersForAddress,
  DEFAULT_CHECKERS 
} from "./src/config";

import { 
  normalizePrivateKey,
  isValidHexKey, 
  isValidBase58Key,
  isValidWIFKey,
  isValidJsonByteArray,
  validateMnemonic,
  isValidMnemonic,
  detectInputType,
  VALID_MNEMONIC_LENGTHS
} from "./src/utils/validation";

import {
  deriveEVMAddress,
  deriveEVMFromMnemonic,
  deriveTronAddress,
  deriveTronFromMnemonic,
} from "./src/chains/evm";

import {
  deriveSolanaAddress,
  deriveSolanaFromMnemonic,
} from "./src/chains/solana";

import {
  deriveBitcoinAddress,
  deriveBitcoinAddressesAll,
  deriveBitcoinFromMnemonic,
  deriveLitecoinFromMnemonic,
  deriveDogecoinFromMnemonic,
} from "./src/chains/bitcoin";

import { deriveCosmosAddress, deriveCosmosFromMnemonic } from "./src/chains/cosmos";

import {
  deriveAptosFromMnemonic,
  deriveSuiFromMnemonic,
  deriveTonFromMnemonic,
  deriveNearFromMnemonic,
  derivePolkadotFromMnemonic,
  deriveXrpFromMnemonic,
  deriveStellarFromMnemonic,
  deriveCardanoFromMnemonic,
} from "./src/chains/other";

import { checkBalances } from "./src/balance";

// ═══════════════════════════════════════════════════════════════════════════════
// ADDRESS DERIVATION
// ═══════════════════════════════════════════════════════════════════════════════

function deriveAllFromMnemonic(mnemonic: string, accountCount: number = 1, standardOnly: boolean = false): MnemonicDerivedKey[] {
  const results: MnemonicDerivedKey[] = [];

  for (let i = 0; i < accountCount; i++) {
    // EVM derivation
    const evmPaths = standardOnly ? [DERIVATION_PATHS.evm[0]] : DERIVATION_PATHS.evm;
    for (const pathConfig of evmPaths) {
      try {
        const { privateKey, address } = deriveEVMFromMnemonic(mnemonic, pathConfig.path, i);
        results.push({
          type: "evm",
          privateKey,
          address,
          path: pathConfig.path.replace(/\/0\/0$/, `/0/${i}`).replace(/\/0'$/, `/${i}'`).replace(/\/0$/, `/${i}`),
          pathName: pathConfig.name,
          accountIndex: i,
        });
      } catch {}
    }

    // Solana derivation
    const solanaPaths = standardOnly ? [DERIVATION_PATHS.solana[0]] : DERIVATION_PATHS.solana;
    for (const pathConfig of solanaPaths) {
      try {
        const { privateKey, address } = deriveSolanaFromMnemonic(mnemonic, pathConfig.path, i);
        results.push({
          type: "solana",
          privateKey,
          address,
          path: pathConfig.path.replace(/\/0'\/0'$/, `/${i}'/0'`).replace(/\/0'$/, `/${i}'`),
          pathName: pathConfig.name,
          accountIndex: i,
        });
      } catch {}
    }

    // Tron derivation
    const tronPaths = standardOnly ? [DERIVATION_PATHS.tron[0]] : DERIVATION_PATHS.tron;
    for (const pathConfig of tronPaths) {
      try {
        const { privateKey, address } = deriveTronFromMnemonic(mnemonic, pathConfig.path, i);
        results.push({
          type: "tron",
          privateKey,
          address,
          path: pathConfig.path.replace(/\/0\/0$/, `/0/${i}`).replace(/\/0$/, `/${i}`),
          pathName: pathConfig.name,
          accountIndex: i,
        });
      } catch {}
    }

    // Bitcoin derivation
    const btcPaths = standardOnly ? [DERIVATION_PATHS.bitcoin[0]] : DERIVATION_PATHS.bitcoin;
    for (const pathConfig of btcPaths) {
      try {
        const { privateKey, address, addressType } = deriveBitcoinFromMnemonic(mnemonic, pathConfig.path, i);
        results.push({
          type: "bitcoin",
          privateKey,
          address,
          path: pathConfig.path.replace(/\/0\/0$/, `/0/${i}`),
          pathName: pathConfig.name,
          accountIndex: i,
          addressType,
        });
      } catch {}
    }

    // Litecoin derivation
    const ltcPaths = standardOnly ? [DERIVATION_PATHS.litecoin[0]] : DERIVATION_PATHS.litecoin;
    for (const pathConfig of ltcPaths) {
      try {
        const { privateKey, address, addressType } = deriveLitecoinFromMnemonic(mnemonic, pathConfig.path, i);
        results.push({
          type: "litecoin",
          privateKey,
          address,
          path: pathConfig.path.replace(/\/0\/0$/, `/0/${i}`),
          pathName: pathConfig.name,
          accountIndex: i,
          addressType,
        });
      } catch {}
    }

    // Dogecoin derivation
    for (const pathConfig of DERIVATION_PATHS.dogecoin) {
      try {
        const { privateKey, address } = deriveDogecoinFromMnemonic(mnemonic, pathConfig.path, i);
        results.push({
          type: "dogecoin",
          privateKey,
          address,
          path: pathConfig.path.replace(/\/0\/0$/, `/0/${i}`),
          pathName: pathConfig.name,
          accountIndex: i,
        });
      } catch {}
    }

    // Cosmos derivation
    for (const pathConfig of DERIVATION_PATHS.cosmos) {
      try {
        const { privateKey, address } = deriveCosmosFromMnemonic(mnemonic, pathConfig.path, i);
        results.push({
          type: "cosmos",
          privateKey,
          address,
          path: pathConfig.path.replace(/\/0\/0$/, `/0/${i}`),
          pathName: pathConfig.name,
          accountIndex: i,
        });
      } catch {}
    }

    // Aptos derivation
    for (const pathConfig of DERIVATION_PATHS.aptos) {
      try {
        const { privateKey, address } = deriveAptosFromMnemonic(mnemonic, pathConfig.path, i);
        results.push({
          type: "aptos",
          privateKey,
          address,
          path: pathConfig.path.replace(/\/0'\/0'$/, `/${i}'/0'`),
          pathName: pathConfig.name,
          accountIndex: i,
        });
      } catch {}
    }

    // Sui derivation
    for (const pathConfig of DERIVATION_PATHS.sui) {
      try {
        const { privateKey, address } = deriveSuiFromMnemonic(mnemonic, pathConfig.path, i);
        results.push({
          type: "sui",
          privateKey,
          address,
          path: pathConfig.path.replace(/\/0'\/0'$/, `/${i}'/0'`),
          pathName: pathConfig.name,
          accountIndex: i,
        });
      } catch {}
    }

    // TON derivation
    for (const pathConfig of DERIVATION_PATHS.ton) {
      try {
        const { privateKey, address } = deriveTonFromMnemonic(mnemonic, pathConfig.path, i);
        results.push({
          type: "ton",
          privateKey,
          address,
          path: pathConfig.path.replace(/\/0'$/, `/${i}'`),
          pathName: pathConfig.name,
          accountIndex: i,
        });
      } catch {}
    }

    // Near derivation
    for (const pathConfig of DERIVATION_PATHS.near) {
      try {
        const { privateKey, address } = deriveNearFromMnemonic(mnemonic, pathConfig.path, i);
        results.push({
          type: "near",
          privateKey,
          address,
          path: pathConfig.path.replace(/\/0'$/, `/${i}'`),
          pathName: pathConfig.name,
          accountIndex: i,
        });
      } catch {}
    }

    // Polkadot derivation
    for (const pathConfig of DERIVATION_PATHS.polkadot) {
      try {
        const { privateKey, address } = derivePolkadotFromMnemonic(mnemonic, pathConfig.path, i);
        results.push({
          type: "polkadot",
          privateKey,
          address,
          path: pathConfig.path.replace(/\/0\/0$/, `/0/${i}`),
          pathName: pathConfig.name,
          accountIndex: i,
        });
      } catch {}
    }

    // XRP derivation
    for (const pathConfig of DERIVATION_PATHS.xrp) {
      try {
        const { privateKey, address } = deriveXrpFromMnemonic(mnemonic, pathConfig.path, i);
        results.push({
          type: "xrp",
          privateKey,
          address,
          path: pathConfig.path.replace(/\/0\/0$/, `/0/${i}`),
          pathName: pathConfig.name,
          accountIndex: i,
        });
      } catch {}
    }

    // Stellar derivation
    for (const pathConfig of DERIVATION_PATHS.stellar) {
      try {
        const { privateKey, address } = deriveStellarFromMnemonic(mnemonic, pathConfig.path, i);
        results.push({
          type: "stellar",
          privateKey,
          address,
          path: pathConfig.path.replace(/\/0'$/, `/${i}'`),
          pathName: pathConfig.name,
          accountIndex: i,
        });
      } catch {}
    }

    // Cardano derivation
    for (const pathConfig of DERIVATION_PATHS.cardano) {
      try {
        const { privateKey, address } = deriveCardanoFromMnemonic(mnemonic, pathConfig.path, i);
        results.push({
          type: "cardano",
          privateKey,
          address,
          path: `m/1852'/1815'/${i}'`,
          pathName: pathConfig.name,
          accountIndex: i,
        });
      } catch {}
    }
  }

  return results;
}

function deriveAddressesFromPrivateKey(privateKey: string): DerivedAddress[] {
  const addresses: DerivedAddress[] = [];
  const inputType = detectInputType(privateKey);

  // Handle hex private keys → EVM, Tron, Bitcoin
  if (inputType === "hex") {
    const normalized = normalizePrivateKey(privateKey);
    
    // EVM chains
    const evmAddress = deriveEVMAddress(normalized);
    for (const [key, network] of Object.entries(NETWORKS)) {
      if (network.type === "evm") {
        addresses.push({
          network: network.name,
          type: "evm",
          address: evmAddress,
          explorer: network.explorer + evmAddress,
          symbol: network.symbol,
        });
      }
    }

    // Tron (uses same secp256k1 curve as EVM)
    const tronAddress = deriveTronAddress(normalized);
    addresses.push({
      network: NETWORKS.tron.name,
      type: "tron",
      address: tronAddress,
      explorer: NETWORKS.tron.explorer + tronAddress,
      symbol: NETWORKS.tron.symbol,
    });

    // Bitcoin (secp256k1 works, derive all address types)
    try {
      const btcAddresses = deriveBitcoinAddressesAll(privateKey);
      for (const btc of btcAddresses) {
        addresses.push({
          network: NETWORKS.bitcoin.name,
          type: "bitcoin",
          address: btc.address,
          explorer: NETWORKS.bitcoin.explorer + btc.address,
          symbol: NETWORKS.bitcoin.symbol,
          addressType: btc.type,
        });
      }
    } catch {}

    // Cosmos (secp256k1, same as EVM)
    try {
      const cosmosAddress = deriveCosmosAddress(normalized);
      addresses.push({
        network: NETWORKS.cosmos.name,
        type: "cosmos",
        address: cosmosAddress,
        explorer: NETWORKS.cosmos.explorer + cosmosAddress,
        symbol: NETWORKS.cosmos.symbol,
      });
    } catch {}
  }

  // Handle WIF keys → Bitcoin only
  if (inputType === "wif") {
    try {
      const btcAddresses = deriveBitcoinAddressesAll(privateKey);
      for (const btc of btcAddresses) {
        addresses.push({
          network: NETWORKS.bitcoin.name,
          type: "bitcoin",
          address: btc.address,
          explorer: NETWORKS.bitcoin.explorer + btc.address,
          symbol: NETWORKS.bitcoin.symbol,
          addressType: btc.type,
        });
      }
    } catch {}
  }

  // Handle base58 keys → Solana
  if (inputType === "base58") {
    try {
      const solAddress = deriveSolanaAddress(privateKey);
      addresses.push({
        network: NETWORKS.solana.name,
        type: "solana",
        address: solAddress,
        explorer: NETWORKS.solana.explorer + solAddress,
        symbol: NETWORKS.solana.symbol,
      });
    } catch {}
  }

  // Handle JSON byte array → Solana
  if (inputType === "json_array") {
    try {
      const solAddress = deriveSolanaAddress(privateKey);
      addresses.push({
        network: NETWORKS.solana.name,
        type: "solana",
        address: solAddress,
        explorer: NETWORKS.solana.explorer + solAddress,
        symbol: NETWORKS.solana.symbol,
      });
    } catch {}
  }

  return addresses;
}

function deriveAddressesFromMnemonic(mnemonic: string, accountCount: number = 1, standardOnly: boolean = false): DerivedAddress[] {
  const addresses: DerivedAddress[] = [];
  const derivedKeys = deriveAllFromMnemonic(mnemonic, accountCount, standardOnly);

  const seenAddresses = new Map<string, MnemonicDerivedKey>();
  
  for (const derived of derivedKeys) {
    const key = `${derived.type}:${derived.address}`;
    if (!seenAddresses.has(key)) {
      seenAddresses.set(key, derived);
    }
  }

  for (const derived of seenAddresses.values()) {
    if (derived.type === "evm") {
      for (const [key, network] of Object.entries(NETWORKS)) {
        if (network.type === "evm") {
          addresses.push({
            network: network.name,
            type: "evm",
            address: derived.address,
            explorer: network.explorer + derived.address,
            symbol: network.symbol,
            derivationPath: derived.path,
            accountIndex: derived.accountIndex,
            privateKey: derived.privateKey,
          });
        }
      }
    } else {
      const networkKey = derived.type as keyof typeof NETWORKS;
      const network = NETWORKS[networkKey];
      if (network) {
        addresses.push({
          network: network.name,
          type: derived.type,
          address: derived.address,
          explorer: network.explorer + derived.address,
          symbol: network.symbol,
          derivationPath: derived.path,
          accountIndex: derived.accountIndex,
          addressType: derived.addressType,
          privateKey: derived.privateKey,
        });
      }
    }
  }

  return addresses;
}

function deriveAddresses(input: string, accountCount: number = 1, standardOnly: boolean = false): DerivedAddress[] {
  const inputType = detectInputType(input);
  
  if (inputType === "mnemonic") {
    return deriveAddressesFromMnemonic(input, accountCount, standardOnly);
  } else if (inputType === "hex" || inputType === "base58" || inputType === "wif" || inputType === "json_array") {
    return deriveAddressesFromPrivateKey(input);
  }
  
  return [];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLI OUTPUT
// ═══════════════════════════════════════════════════════════════════════════════

const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgGreen: "\x1b[42m",
  bgRed: "\x1b[41m",
};

function printHeader() {
  console.log(`
${colors.cyan}╔═══════════════════════════════════════════════════════════════════════════════╗
║${colors.bold}                                   MYCHECKER                                   ${colors.reset}${colors.cyan}║
║${colors.dim}                    Multi-Chain Address & Balance Tool                          ${colors.reset}${colors.cyan}║
╚═══════════════════════════════════════════════════════════════════════════════╝${colors.reset}
`);
}

function printAddresses(addresses: DerivedAddress[], filterType?: string, showPaths: boolean = false, showCheckers: boolean = false, showKeys: boolean = false, config: UserConfig = {}) {
  const filtered = filterType ? addresses.filter((a) => a.type === filterType) : addresses;

  const grouped = new Map<string, Map<string, DerivedAddress[]>>();
  for (const addr of filtered) {
    if (!grouped.has(addr.type)) {
      grouped.set(addr.type, new Map());
    }
    const typeGroup = grouped.get(addr.type)!;
    const key = `${addr.address}:${addr.accountIndex ?? 0}`;
    if (!typeGroup.has(key)) {
      typeGroup.set(key, []);
    }
    typeGroup.get(key)!.push(addr);
  }

  for (const [type, addressGroups] of grouped) {
    const typeLabel = type.toUpperCase();
    const color = type === "evm" ? colors.blue : type === "solana" ? colors.magenta : type === "bitcoin" ? colors.yellow : colors.cyan;

    console.log(`\n${color}${colors.bold}═══ ${typeLabel} ═══${colors.reset}`);

    for (const [key, addrs] of addressGroups) {
      const addr = addrs[0];
      const accountLabel = addr.accountIndex !== undefined && addr.accountIndex > 0 
        ? ` ${colors.dim}(Account ${addr.accountIndex})${colors.reset}` 
        : "";

      if (type === "evm") {
        console.log(`\n${colors.bold}Address:${colors.reset} ${addr.address}${accountLabel}`);
        if (showPaths && addr.derivationPath) {
          console.log(`${colors.dim}Path: ${addr.derivationPath}${colors.reset}`);
        }
        console.log(`${colors.dim}Networks: ${addrs.map((a) => a.network).join(", ")}${colors.reset}`);
        console.log(`${colors.cyan}Explorer:${colors.reset} ${addrs[0].explorer}`);
        if (showKeys && addr.privateKey) {
          console.log(`${colors.yellow}Private Key:${colors.reset} ${addr.privateKey}`);
        }
        
        if (showCheckers) {
          const checkers = getCheckersForAddress(addr.address, "evm", "ethereum", config);
          if (checkers.length > 0) {
            console.log(`${colors.magenta}Checkers:${colors.reset}`);
            for (const checker of checkers) {
              console.log(`  ${colors.dim}${checker.name}:${colors.reset} ${checker.url}`);
            }
          }
        }
      } else if (type === "bitcoin") {
        const addrTypeLabel = addr.addressType ? ` ${colors.dim}(${addr.addressType})${colors.reset}` : "";
        console.log(`\n${colors.bold}Address:${colors.reset} ${addr.address}${addrTypeLabel}${accountLabel}`);
        if (showPaths && addr.derivationPath) {
          console.log(`${colors.dim}Path: ${addr.derivationPath}${colors.reset}`);
        }
        console.log(`${colors.cyan}Explorer:${colors.reset} ${addr.explorer}`);
        if (showKeys && addr.privateKey) {
          console.log(`${colors.yellow}Private Key:${colors.reset} ${addr.privateKey}`);
        }
        
        if (showCheckers) {
          const checkers = getCheckersForAddress(addr.address, "bitcoin", "bitcoin", config);
          if (checkers.length > 0) {
            console.log(`${colors.magenta}Checkers:${colors.reset}`);
            for (const checker of checkers) {
              console.log(`  ${colors.dim}${checker.name}:${colors.reset} ${checker.url}`);
            }
          }
        }
      } else if (type === "solana") {
        console.log(`\n${colors.bold}Address:${colors.reset} ${addr.address}${accountLabel}`);
        if (showPaths && addr.derivationPath) {
          console.log(`${colors.dim}Path: ${addr.derivationPath}${colors.reset}`);
        }
        console.log(`${colors.cyan}Explorer:${colors.reset} ${addr.explorer}`);
        if (showKeys && addr.privateKey) {
          console.log(`${colors.yellow}Private Key:${colors.reset} ${addr.privateKey}`);
        }
        
        if (showCheckers) {
          const checkers = getCheckersForAddress(addr.address, "solana", "solana", config);
          if (checkers.length > 0) {
            console.log(`${colors.magenta}Checkers:${colors.reset}`);
            for (const checker of checkers) {
              console.log(`  ${colors.dim}${checker.name}:${colors.reset} ${checker.url}`);
            }
          }
        }
      } else if (type === "tron") {
        console.log(`\n${colors.bold}Address:${colors.reset} ${addr.address}${accountLabel}`);
        if (showPaths && addr.derivationPath) {
          console.log(`${colors.dim}Path: ${addr.derivationPath}${colors.reset}`);
        }
        console.log(`${colors.cyan}Explorer:${colors.reset} ${addr.explorer}`);
        if (showKeys && addr.privateKey) {
          console.log(`${colors.yellow}Private Key:${colors.reset} ${addr.privateKey}`);
        }
        
        if (showCheckers) {
          const checkers = getCheckersForAddress(addr.address, "tron", "tron", config);
          if (checkers.length > 0) {
            console.log(`${colors.magenta}Checkers:${colors.reset}`);
            for (const checker of checkers) {
              console.log(`  ${colors.dim}${checker.name}:${colors.reset} ${checker.url}`);
            }
          }
        }
      } else {
        console.log(`\n${colors.bold}Address:${colors.reset} ${addr.address}${accountLabel}`);
        if (showPaths && addr.derivationPath) {
          console.log(`${colors.dim}Path: ${addr.derivationPath}${colors.reset}`);
        }
        console.log(`${colors.cyan}Explorer:${colors.reset} ${addr.explorer}`);
        if (showKeys && addr.privateKey) {
          console.log(`${colors.yellow}Private Key:${colors.reset} ${addr.privateKey}`);
        }
      }
    }
  }
}

function printBalances(balances: BalanceResult[]) {
  console.log(`\n${colors.green}${colors.bold}═══ BALANCES ═══${colors.reset}\n`);

  const withBalance = balances.filter((b) => b.hasBalance);
  const withoutBalance = balances.filter((b) => !b.hasBalance && b.balance !== "Error");
  const errors = balances.filter((b) => b.balance === "Error");

  if (withBalance.length > 0) {
    console.log(`${colors.bgGreen}${colors.bold} 💰 FUNDS FOUND ${colors.reset}\n`);
    for (const b of withBalance) {
      console.log(`  ${colors.green}●${colors.reset} ${colors.bold}${b.network}${colors.reset} ${b.address}: ${b.balance} ${b.symbol}${b.usdValue ? ` (${b.usdValue})` : ""}`);
    }
  }

  if (withoutBalance.length > 0) {
    console.log(`\n${colors.dim}Empty wallets:${colors.reset}`);
    for (const b of withoutBalance) {
      console.log(`  ${colors.dim}○ ${b.network} ${b.address}: 0 ${b.symbol}${colors.reset}`);
    }
  }

  if (errors.length > 0) {
    console.log(`\n${colors.red}Errors:${colors.reset}`);
    for (const b of errors) {
      const errorDetail = b.error ? `: ${b.error}` : ": Failed to fetch";
      console.log(`  ${colors.red}✗ ${b.network}${errorDetail}${colors.reset}`);
    }
  }

  if (withBalance.length === 0) {
    console.log(`${colors.yellow}No funds found on checked networks.${colors.reset}`);
  }
}

function printUsage() {
  console.log(`
${colors.bold}Usage:${colors.reset}
  mychecker <private_key_or_mnemonic> [options]

${colors.bold}Input Formats:${colors.reset}
  • ${colors.green}Mnemonic (12-24 words)${colors.reset}: Works with ALL chains (recommended)
    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"
  
  • ${colors.blue}Hex private key (64 chars)${colors.reset}: EVM, Tron, Bitcoin
    1E99423A4ED27608A15A2616C8E7B2A3E2F7A6B3C1D9E5F8A4B7C9D2E6F0A91
  
  • ${colors.yellow}Bitcoin WIF key${colors.reset}: Starts with 5, K, or L
    L5BmPijJjrKbiUfG4zbiFKNqkvuJ8usooJmzuD7Z8dkRoTThYnAT
  
  • ${colors.magenta}Solana base58 keypair${colors.reset}: 64-byte keypair
    4wBqpZM9k4...
  
  • ${colors.magenta}Solana JSON array${colors.reset}: [12, 87, 203, 44, ...] (64 elements)

${colors.bold}Key Format Compatibility:${colors.reset}
  ${colors.blue}Hex key (64 chars) → ${colors.reset}EVM, Tron, Bitcoin
  ${colors.yellow}WIF key (5/K/L...) → ${colors.reset}Bitcoin only
  ${colors.magenta}Base58/JSON array → ${colors.reset}Solana only
  ${colors.green}Mnemonic → ${colors.reset}ALL chains

${colors.bold}Options:${colors.reset}
  --check             Check balances on all networks
  --network <name>    Filter to specific network (ethereum, bsc, polygon, solana, tron, bitcoin, etc.)
  --type <type>       Filter by chain type (evm, solana, tron, bitcoin)
  --accounts <n>      Number of accounts to derive from mnemonic (default: 1)
  --all-paths         Use all derivation paths (default: standard path only when --accounts > 1)
  --paths             Show derivation paths in output
  --json              Output as JSON (for bulk processing)
  --compact           Compact output (addresses only)
  --checkers          Show additional checker URLs (DeBank, Zapper, etc.)
  --show-keys         Show private keys in output (use with caution!)
  --config <path>     Path to custom config file
  --init-config       Generate sample config file
  --insecure          Disable SSL verification (for VPN/proxy environments)
  --help              Show this help

${colors.bold}Examples:${colors.reset}
  ${colors.dim}# From private key${colors.reset}
  mychecker afdfd9c3d2095ef696594f6cedcae59e72dcd697e2a7521b1578140422a4f890

  ${colors.dim}# From mnemonic (quote the phrase)${colors.reset}
  mychecker "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"

  ${colors.dim}# Derive multiple accounts from mnemonic${colors.reset}
  mychecker "your mnemonic phrase here" --accounts 5 --paths

  ${colors.dim}# Check balances${colors.reset}
  mychecker <key_or_mnemonic> --check

  ${colors.dim}# Only EVM chains with paths${colors.reset}
  mychecker "mnemonic" --type evm --paths

  ${colors.dim}# Check specific network${colors.reset}
  mychecker <key> --check --network ethereum

${colors.bold}Derivation Paths:${colors.reset}
  ${colors.blue}EVM:${colors.reset}     m/44'/60'/0'/0/x  (MetaMask, Ledger)
  ${colors.magenta}Solana:${colors.reset}  m/44'/501'/x'/0'  (Phantom, Solflare)
  ${colors.cyan}Tron:${colors.reset}    m/44'/195'/0'/0/x (TronLink)
  ${colors.yellow}Bitcoin:${colors.reset} m/84'/0'/0'/0/x   (Native SegWit bc1q...)
           m/49'/0'/0'/0/x   (SegWit 3...)
           m/44'/0'/0'/0/x   (Legacy 1...)
           m/86'/0'/0'/0/x   (Taproot bc1p...)
  TON:       Wallet V4R2 (own TON key scheme, no BIP44)
  Polkadot:  sr25519 root account (SS58)
  Cardano:   m/1852'/1815'/x' (CIP-1852 base address)

${colors.bold}Supported Networks:${colors.reset}
  ${colors.blue}EVM (22):${colors.reset} ethereum, bsc, polygon, arbitrum, optimism, avalanche, fantom,
            base, zksync, linea, scroll, mantle, celo, gnosis, blast, opbnb,
            polygonzkevm, cronos, aurora, zora, ink, bera
  ${colors.magenta}Solana:${colors.reset} solana
  ${colors.cyan}Tron:${colors.reset} tron
  ${colors.yellow}Bitcoin:${colors.reset} bitcoin, litecoin, dogecoin
  ${colors.green}Other:${colors.reset} cosmos, aptos, sui, ton, near, polkadot, xrp, stellar, cardano
`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printHeader();
    printUsage();
    process.exit(0);
  }

  // Parse arguments
  const flagIndices = new Set<number>();
  const flagsWithValues = ["--network", "--type", "--accounts", "--config"];
  
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      flagIndices.add(i);
      if (flagsWithValues.includes(args[i]) && i + 1 < args.length) {
        flagIndices.add(i + 1);
      }
    }
  }

  const inputParts = args.filter((_, i) => !flagIndices.has(i));
  const input = inputParts.join(" ").trim();

  const shouldCheck = args.includes("--check");
  const compact = args.includes("--compact");
  const showPaths = args.includes("--paths");
  const jsonOutput = args.includes("--json");
  const allPaths = args.includes("--all-paths");
  const showCheckers = args.includes("--checkers");
  const initConfig = args.includes("--init-config");
  const insecure = args.includes("--insecure");
  const showKeys = args.includes("--show-keys");
  
  // Disable SSL verification if --insecure flag is used (for VPN/proxy environments)
  if (insecure) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }

  const configIndex = args.indexOf("--config");
  const configPath = configIndex !== -1 ? args[configIndex + 1] : undefined;
  
  const config = loadConfig(configPath);
  
  if (initConfig) {
    const outputPath = join(process.cwd(), "mychecker.config.json");
    writeFileSync(outputPath, generateSampleConfig());
    console.log(`${colors.green}Created sample config at: ${outputPath}${colors.reset}`);
    console.log(`${colors.dim}Edit this file to customize explorers and checkers.${colors.reset}`);
    process.exit(0);
  }

  const networkIndex = args.indexOf("--network");
  const network = networkIndex !== -1 ? args[networkIndex + 1] : undefined;

  const typeIndex = args.indexOf("--type");
  const filterType = typeIndex !== -1 ? args[typeIndex + 1] : undefined;

  const accountsIndex = args.indexOf("--accounts");
  const accountCount = accountsIndex !== -1 ? parseInt(args[accountsIndex + 1]) || 1 : 1;
  
  const standardOnly = !allPaths;

  if (!input) {
    console.error(`${colors.red}Error: Private key or mnemonic required${colors.reset}`);
    printUsage();
    process.exit(1);
  }

  const inputType = detectInputType(input);

  if (inputType === "unknown") {
    const words = input.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length >= 3) {
      const validation = validateMnemonic(input);
      console.error(`${colors.red}Error: Invalid mnemonic${colors.reset}`);
      console.error(`${colors.yellow}${validation.error}${colors.reset}`);
      console.error(`${colors.dim}
Mnemonic requirements (same for all networks):
  • Word count: 12, 15, 18, 21, or 24 words
  • Words must be from BIP39 wordlist
  • Checksum must be valid
  
Example: "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"${colors.reset}`);
    } else {
      // Provide specific feedback based on what the input looks like
      const trimmed = input.trim();
      const hexLike = /^(0x)?[a-fA-F0-9]+$/i.test(trimmed);
      const base58Like = /^[1-9A-HJ-NP-Za-km-z]+$/.test(trimmed);
      const jsonLike = trimmed.startsWith("[") && trimmed.endsWith("]");
      
      console.error(`${colors.red}Error: Invalid input format${colors.reset}`);
      
      if (hexLike) {
        const len = trimmed.startsWith("0x") ? trimmed.length - 2 : trimmed.length;
        if (len < 64) {
          console.error(`${colors.yellow}Hex key too short: ${len} characters (need 64)${colors.reset}`);
        } else if (len > 64) {
          console.error(`${colors.yellow}Hex key too long: ${len} characters (need 64)${colors.reset}`);
        } else {
          console.error(`${colors.yellow}Invalid hex characters in key${colors.reset}`);
        }
      } else if (base58Like) {
        console.error(`${colors.yellow}Invalid base58 key - may have wrong length or invalid checksum${colors.reset}`);
        console.error(`${colors.dim}For Bitcoin WIF: must start with 5, K, or L and be 51-52 characters`);
        console.error(`For Solana: must be 64-byte base58 encoded keypair (~87-88 chars)${colors.reset}`);
      } else if (jsonLike) {
        console.error(`${colors.yellow}Invalid JSON byte array${colors.reset}`);
        console.error(`${colors.dim}Must be array of numbers 0-255, with 32 or 64 elements`);
        console.error(`Example: [55, 223, 87, 59, ... ] (64 numbers for keypair)${colors.reset}`);
      } else {
        console.error(`${colors.dim}
Accepted formats:
  • Mnemonic: 12-24 word seed phrase (works with ALL chains)
  • Hex key: 64 hex characters (EVM, Tron, Bitcoin, Cosmos)
  • WIF key: Bitcoin private key starting with 5, K, or L
  • Base58: Solana keypair (64 bytes, ~87-88 chars)
  • JSON array: [12, 87, 203, ...] Solana byte array (64 numbers)${colors.reset}`);
      }
    }
    process.exit(1);
  }

  if (!compact && !jsonOutput) {
    printHeader();
    const inputLabels: Record<string, string> = {
      mnemonic: "Mnemonic",
      hex: "Hex Private Key",
      wif: "Bitcoin WIF Key",
      base58: "Solana Base58 Key",
      json_array: "Solana JSON Array",
    };
    const inputLabel = inputLabels[inputType] || "Private Key";
    const inputPreview = inputType === "mnemonic" 
      ? `${input.split(" ").slice(0, 3).join(" ")}... (${input.split(" ").length} words)`
      : inputType === "json_array"
        ? `[${input.trim().slice(1, 20)}...] (${JSON.parse(input).length} bytes)`
        : `${input.slice(0, 8)}...${input.slice(-8)}`;
    console.log(`${colors.dim}Input: ${inputLabel} - ${inputPreview}${colors.reset}`);
    if (inputType === "mnemonic" && accountCount > 1) {
      console.log(`${colors.dim}Deriving ${accountCount} accounts${standardOnly ? " (standard path)" : " (all paths)"}...${colors.reset}`);
    }
  }

  const addresses = deriveAddresses(input, accountCount, standardOnly);

  if (addresses.length === 0) {
    console.error(`${colors.red}Error: Could not derive any addresses from this input${colors.reset}`);
    process.exit(1);
  }

  let filteredAddresses = addresses;
  if (network) {
    const networkConfig = NETWORKS[network.toLowerCase()];
    if (!networkConfig) {
      console.error(`${colors.red}Error: Unknown network '${network}'${colors.reset}`);
      console.error(`${colors.dim}Available: ${Object.keys(NETWORKS).join(", ")}${colors.reset}`);
      process.exit(1);
    }
    filteredAddresses = addresses.filter((a) => a.network === networkConfig.name);
  }

  const typeFiltered = filterType 
    ? filteredAddresses.filter(a => a.type === filterType)
    : filteredAddresses;

  // Check if no addresses match the filter
  if (typeFiltered.length === 0 && (network || filterType)) {
    const requestedNetwork = network || filterType;
    const chainInfo: Record<string, { keyType: string; reason: string }> = {
      solana: { keyType: "base58 or JSON array", reason: "Solana uses ed25519, not secp256k1" },
      polkadot: { keyType: "mnemonic only", reason: "Polkadot uses sr25519 (Schnorrkel), not secp256k1" },
      aptos: { keyType: "mnemonic only", reason: "Aptos uses ed25519, not secp256k1" },
      sui: { keyType: "mnemonic only", reason: "Sui uses ed25519, not secp256k1" },
      ton: { keyType: "mnemonic only", reason: "TON uses ed25519, not secp256k1" },
      near: { keyType: "mnemonic only", reason: "Near uses ed25519, not secp256k1" },
      stellar: { keyType: "mnemonic only", reason: "Stellar uses ed25519, not secp256k1" },
      cardano: { keyType: "mnemonic only", reason: "Cardano uses ed25519-bip32, not secp256k1" },
      xrp: { keyType: "mnemonic only", reason: "XRP uses secp256k1 but requires specific encoding" },
    };
    
    if (inputType === "hex") {
      console.log(`\n${colors.yellow}No addresses generated for '${requestedNetwork}'.${colors.reset}`);
      const info = chainInfo[requestedNetwork?.toLowerCase() || ""];
      if (info) {
        console.log(`${colors.dim}${info.reason}`);
        console.log(`${requestedNetwork} requires: ${info.keyType}${colors.reset}`);
      } else {
        console.log(`${colors.dim}Hex private keys work with: EVM chains, Tron, Bitcoin, Cosmos${colors.reset}`);
      }
      console.log(`\n${colors.cyan}Use a mnemonic phrase instead:`);
      console.log(`  mychecker "your twelve word mnemonic phrase here" --network ${requestedNetwork}${colors.reset}\n`);
      process.exit(0);
    } else if (inputType === "wif") {
      console.log(`\n${colors.yellow}No addresses generated for '${requestedNetwork}'.${colors.reset}`);
      console.log(`${colors.dim}WIF keys (5xxx, Kxxx, Lxxx) only work with Bitcoin.`);
      console.log(`For ${requestedNetwork}, use a mnemonic phrase instead.${colors.reset}\n`);
      process.exit(0);
    } else if (inputType === "base58" || inputType === "json_array") {
      console.log(`\n${colors.yellow}No addresses generated for '${requestedNetwork}'.${colors.reset}`);
      console.log(`${colors.dim}Base58/JSON array keys only work with Solana.`);
      console.log(`For ${requestedNetwork}, use a mnemonic phrase instead.${colors.reset}\n`);
      process.exit(0);
    }
  }

  if (jsonOutput) {
    const seen = new Map<string, any>();
    for (const addr of typeFiltered) {
      const key = `${addr.type}:${addr.address}`;
      if (!seen.has(key)) {
        seen.set(key, {
          type: addr.type,
          address: addr.address,
          path: addr.derivationPath,
          accountIndex: addr.accountIndex ?? 0,
          explorer: addr.explorer,
        });
      }
    }
    console.log(JSON.stringify(Array.from(seen.values()), null, 2));
    return;
  }

  if (compact) {
    const seen = new Set<string>();
    for (const addr of typeFiltered) {
      const key = `${addr.type}:${addr.address}`;
      if (!seen.has(key)) {
        seen.add(key);
        const pathInfo = showPaths && addr.derivationPath ? ` [${addr.derivationPath}]` : "";
        const indexInfo = addr.accountIndex !== undefined && addr.accountIndex > 0 ? ` #${addr.accountIndex}` : "";
        console.log(`${addr.type.toUpperCase()}${indexInfo}: ${addr.address}${pathInfo}`);
      }
    }
  } else {
    printAddresses(typeFiltered, undefined, showPaths || inputType === "mnemonic", showCheckers, showKeys, config);
  }

  if (shouldCheck && !jsonOutput) {
    const hasApiKeys = config.apiKeys && Object.values(config.apiKeys).some(k => k);
    if (hasApiKeys) {
      console.log(`\n${colors.dim}Checking balances (using configured API keys)...${colors.reset}`);
    } else {
      console.log(`\n${colors.dim}Checking balances...${colors.reset}`);
    }
    const networks = network ? [network.toLowerCase()] : undefined;
    const balances = await checkBalances(typeFiltered, networks, config);
    printBalances(balances);
  }
}

main().catch((error) => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
