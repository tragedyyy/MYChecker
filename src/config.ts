// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

import { existsSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { UserConfig, CheckerService, ChainType } from "./types";
import { NETWORKS } from "./networks";

export const DEFAULT_CHECKERS: CheckerService[] = [
  {
    name: "DeBank",
    urlTemplate: "https://debank.com/profile/{address}",
    types: ["evm"],
  },
  {
    name: "Zapper",
    urlTemplate: "https://zapper.xyz/account/{address}",
    types: ["evm"],
  },
  {
    name: "Arkham",
    urlTemplate: "https://platform.arkhamintelligence.com/explorer/address/{address}",
    types: ["evm", "bitcoin"],
  },
  {
    name: "Zerion",
    urlTemplate: "https://app.zerion.io/{address}/overview",
    types: ["evm"],
  },
  {
    name: "Solscan",
    urlTemplate: "https://solscan.io/account/{address}",
    types: ["solana"],
  },
  {
    name: "SolanaFM",
    urlTemplate: "https://solana.fm/address/{address}",
    types: ["solana"],
  },
  {
    name: "Blockchair BTC",
    urlTemplate: "https://blockchair.com/bitcoin/address/{address}",
    types: ["bitcoin"],
  },
  {
    name: "TronScan",
    urlTemplate: "https://tronscan.org/#/address/{address}",
    types: ["tron"],
  },
];

export const CONFIG_PATHS = [
  join(process.cwd(), "mychecker.config.json"),
  join(process.cwd(), ".mycheckerrc"),
  join(homedir(), ".mychecker.json"),
  join(homedir(), ".config", "mychecker", "config.json"),
];

export function loadConfig(customPath?: string): UserConfig {
  const paths = customPath ? [customPath, ...CONFIG_PATHS] : CONFIG_PATHS;
  
  for (const configPath of paths) {
    if (existsSync(configPath)) {
      try {
        const content = readFileSync(configPath, "utf-8");
        return JSON.parse(content);
      } catch {
        // Skip invalid config files
      }
    }
  }
  
  return {};
}

export function generateSampleConfig(): string {
  const sample: UserConfig = {
    apiKeys: {
      debank: "",
      etherscan: "",
      bscscan: "",
      polygonscan: "",
      arbiscan: "",
      basescan: "",
      solscan: "",
      trongrid: "",
      blockchair: "",
    },
    customExplorers: {
      ethereum: "https://etherscan.io/address/{address}",
      bsc: "https://bscscan.com/address/{address}",
    },
    additionalCheckers: [
      {
        name: "My Custom Explorer",
        urlTemplate: "https://myexplorer.com/address/{address}",
        types: ["evm"],
        networks: ["ethereum"],
      },
    ],
    disabledCheckers: [],
  };
  return JSON.stringify(sample, null, 2);
}

export function getCheckersForAddress(
  address: string,
  type: ChainType,
  networkKey: string,
  config: UserConfig
): { name: string; url: string }[] {
  const checkers: { name: string; url: string }[] = [];
  const disabledSet = new Set(config.disabledCheckers || []);
  
  const allCheckers = [...DEFAULT_CHECKERS, ...(config.additionalCheckers || [])];
  
  for (const checker of allCheckers) {
    if (disabledSet.has(checker.name)) continue;
    if (!checker.types.includes(type)) continue;
    if (checker.networks && !checker.networks.includes(networkKey)) continue;
    
    checkers.push({
      name: checker.name,
      url: checker.urlTemplate.replace("{address}", address),
    });
  }
  
  return checkers;
}

export function getExplorerUrl(networkKey: string, address: string, config: UserConfig): string {
  if (config.customExplorers?.[networkKey]) {
    return config.customExplorers[networkKey].replace("{address}", address);
  }
  
  const network = NETWORKS[networkKey];
  return network ? network.explorer + address : "";
}
