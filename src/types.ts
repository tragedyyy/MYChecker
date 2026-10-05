// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export type ChainType = 
  | "evm" 
  | "solana" 
  | "tron" 
  | "bitcoin" 
  | "cosmos" 
  | "aptos" 
  | "sui" 
  | "ton" 
  | "near" 
  | "cardano" 
  | "polkadot" 
  | "xrp" 
  | "stellar" 
  | "dogecoin" 
  | "litecoin";

export interface Network {
  name: string;
  type: ChainType;
  explorer: string;
  rpc?: string;
  chainId?: number;
  symbol: string;
  balanceApi?: (address: string) => string;
}

export interface DerivationPath {
  name: string;
  path: string;
  type: ChainType;
  description: string;
}

export interface DerivedAddress {
  network: string;
  type: string;
  address: string;
  explorer: string;
  symbol: string;
  derivationPath?: string;
  accountIndex?: number;
  addressType?: string;
  privateKey?: string;
  checkers?: { name: string; url: string }[];
}

export interface MnemonicDerivedKey {
  type: ChainType;
  privateKey: string;
  address: string;
  path: string;
  pathName: string;
  accountIndex: number;
  addressType?: string;
}

export interface BalanceResult {
  network: string;
  address: string;
  balance: string;
  symbol: string;
  usdValue?: string;
  hasBalance: boolean;
  error?: string;
}

export interface CheckerService {
  name: string;
  urlTemplate: string;
  types: ChainType[];
  networks?: string[];
}

export interface ApiKeyConfig {
  debank?: string;
  etherscan?: string;
  bscscan?: string;
  polygonscan?: string;
  arbiscan?: string;
  optimism?: string;
  basescan?: string;
  solscan?: string;
  trongrid?: string;
  blockchair?: string;
}

export interface UserConfig {
  customExplorers?: Record<string, string>;
  additionalCheckers?: CheckerService[];
  disabledCheckers?: string[];
  apiKeys?: ApiKeyConfig;
}

export interface MnemonicValidation {
  valid: boolean;
  wordCount: number;
  error?: string;
}
