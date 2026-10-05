// ═══════════════════════════════════════════════════════════════════════════════
// NETWORK CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

import type { Network, DerivationPath } from "./types";

export const NETWORKS: Record<string, Network> = {
  // EVM Networks
  ethereum: {
    name: "Ethereum",
    type: "evm",
    explorer: "https://etherscan.io/address/",
    rpc: "https://ethereum-rpc.publicnode.com",
    chainId: 1,
    symbol: "ETH",
  },
  bsc: {
    name: "BNB Smart Chain",
    type: "evm",
    explorer: "https://bscscan.com/address/",
    rpc: "https://bsc-rpc.publicnode.com",
    chainId: 56,
    symbol: "BNB",
  },
  polygon: {
    name: "Polygon",
    type: "evm",
    explorer: "https://polygonscan.com/address/",
    rpc: "https://1rpc.io/matic",
    chainId: 137,
    symbol: "POL",
  },
  arbitrum: {
    name: "Arbitrum One",
    type: "evm",
    explorer: "https://arbiscan.io/address/",
    rpc: "https://arbitrum-one-rpc.publicnode.com",
    chainId: 42161,
    symbol: "ETH",
  },
  optimism: {
    name: "Optimism",
    type: "evm",
    explorer: "https://optimistic.etherscan.io/address/",
    rpc: "https://optimism-rpc.publicnode.com",
    chainId: 10,
    symbol: "ETH",
  },
  avalanche: {
    name: "Avalanche C-Chain",
    type: "evm",
    explorer: "https://snowtrace.io/address/",
    rpc: "https://avalanche-c-chain-rpc.publicnode.com",
    chainId: 43114,
    symbol: "AVAX",
  },
  fantom: {
    name: "Fantom",
    type: "evm",
    explorer: "https://ftmscan.com/address/",
    rpc: "https://fantom.drpc.org",
    chainId: 250,
    symbol: "FTM",
  },
  base: {
    name: "Base",
    type: "evm",
    explorer: "https://basescan.org/address/",
    rpc: "https://base-rpc.publicnode.com",
    chainId: 8453,
    symbol: "ETH",
  },
  zksync: {
    name: "zkSync Era",
    type: "evm",
    explorer: "https://explorer.zksync.io/address/",
    rpc: "https://mainnet.era.zksync.io",
    chainId: 324,
    symbol: "ETH",
  },
  linea: {
    name: "Linea",
    type: "evm",
    explorer: "https://lineascan.build/address/",
    rpc: "https://rpc.linea.build",
    chainId: 59144,
    symbol: "ETH",
  },
  // EVM networks added manually (RPC endpoints verified)
  scroll: {
    name: "Scroll",
    type: "evm",
    explorer: "https://scrollscan.com/address/",
    rpc: "https://rpc.scroll.io",
    chainId: 534352,
    symbol: "ETH",
  },
  mantle: {
    name: "Mantle",
    type: "evm",
    explorer: "https://mantlescan.xyz/address/",
    rpc: "https://rpc.mantle.xyz",
    chainId: 5000,
    symbol: "MNT",
  },
  celo: {
    name: "Celo",
    type: "evm",
    explorer: "https://celoscan.io/address/",
    rpc: "https://forno.celo.org",
    chainId: 42220,
    symbol: "CELO",
  },
  gnosis: {
    name: "Gnosis",
    type: "evm",
    explorer: "https://gnosisscan.io/address/",
    rpc: "https://rpc.gnosischain.com",
    chainId: 100,
    symbol: "xDAI",
  },
  blast: {
    name: "Blast",
    type: "evm",
    explorer: "https://blastscan.io/address/",
    rpc: "https://rpc.blast.io",
    chainId: 81457,
    symbol: "ETH",
  },
  opbnb: {
    name: "opBNB",
    type: "evm",
    explorer: "https://opbnb.bscscan.com/address/",
    rpc: "https://opbnb-rpc.publicnode.com",
    chainId: 204,
    symbol: "BNB",
  },
  polygonzkevm: {
    name: "Polygon zkEVM",
    type: "evm",
    explorer: "https://zkevm.polygonscan.com/address/",
    rpc: "https://zkevm-rpc.com",
    chainId: 1101,
    symbol: "ETH",
  },
  cronos: {
    name: "Cronos",
    type: "evm",
    explorer: "https://cronoscan.com/address/",
    rpc: "https://evm.cronos.org",
    chainId: 25,
    symbol: "CRO",
  },
  aurora: {
    name: "Aurora",
    type: "evm",
    explorer: "https://explorer.aurora.dev/address/",
    rpc: "https://aurora.drpc.org",
    chainId: 1313161554,
    symbol: "ETH",
  },
  zora: {
    name: "Zora",
    type: "evm",
    explorer: "https://explorer.zora.energy/address/",
    rpc: "https://zora.drpc.org",
    chainId: 7777777,
    symbol: "ETH",
  },
  ink: {
    name: "Ink",
    type: "evm",
    explorer: "https://explorer.inkonchain.com/address/",
    rpc: "https://rpc-gel.inkonchain.com",
    chainId: 57073,
    symbol: "ETH",
  },
  bera: {
    name: "Berachain",
    type: "evm",
    explorer: "https://berascan.com/address/",
    rpc: "https://rpc.berachain.com",
    chainId: 80094,
    symbol: "BERA",
  },
  // Solana
  solana: {
    name: "Solana",
    type: "solana",
    explorer: "https://solscan.io/account/",
    rpc: "https://api.mainnet-beta.solana.com",
    symbol: "SOL",
  },
  // Tron
  tron: {
    name: "Tron",
    type: "tron",
    explorer: "https://tronscan.org/#/address/",
    rpc: "https://api.trongrid.io",
    symbol: "TRX",
  },
  // Bitcoin
  bitcoin: {
    name: "Bitcoin",
    type: "bitcoin",
    explorer: "https://mempool.space/address/",
    symbol: "BTC",
  },
  // Litecoin
  litecoin: {
    name: "Litecoin",
    type: "litecoin",
    explorer: "https://blockchair.com/litecoin/address/",
    symbol: "LTC",
  },
  // Dogecoin
  dogecoin: {
    name: "Dogecoin",
    type: "dogecoin",
    explorer: "https://blockchair.com/dogecoin/address/",
    symbol: "DOGE",
  },
  // Cosmos
  cosmos: {
    name: "Cosmos",
    type: "cosmos",
    explorer: "https://www.mintscan.io/cosmos/address/",
    rpc: "https://cosmos-rest.publicnode.com",
    symbol: "ATOM",
  },
  // Aptos
  aptos: {
    name: "Aptos",
    type: "aptos",
    explorer: "https://explorer.aptoslabs.com/account/",
    rpc: "https://fullnode.mainnet.aptoslabs.com/v1",
    symbol: "APT",
  },
  // Sui
  sui: {
    name: "Sui",
    type: "sui",
    explorer: "https://suiscan.xyz/mainnet/account/",
    rpc: "https://sui-rpc.publicnode.com",
    symbol: "SUI",
  },
  // TON
  ton: {
    name: "TON",
    type: "ton",
    explorer: "https://tonscan.org/address/",
    rpc: "https://toncenter.com/api/v2",
    symbol: "TON",
  },
  // Near
  near: {
    name: "Near",
    type: "near",
    explorer: "https://nearblocks.io/address/",
    rpc: "https://rpc.mainnet.near.org",
    symbol: "NEAR",
  },
  // Polkadot
  polkadot: {
    name: "Polkadot",
    type: "polkadot",
    explorer: "https://polkadot.subscan.io/account/",
    rpc: "https://rpc.polkadot.io",
    symbol: "DOT",
  },
  // XRP
  xrp: {
    name: "XRP",
    type: "xrp",
    explorer: "https://xrpscan.com/account/",
    rpc: "https://xrplcluster.com",
    symbol: "XRP",
  },
  // Stellar
  stellar: {
    name: "Stellar",
    type: "stellar",
    explorer: "https://stellarchain.io/accounts/",
    rpc: "https://horizon.stellar.org",
    symbol: "XLM",
  },
  // Cardano
  cardano: {
    name: "Cardano",
    type: "cardano",
    explorer: "https://cardanoscan.io/address/",
    rpc: "https://api.koios.rest/api/v1",
    symbol: "ADA",
  },
};

export const DERIVATION_PATHS: Record<string, DerivationPath[]> = {
  evm: [
    { name: "Default", path: "m/44'/60'/0'/0/0", type: "evm", description: "Standard BIP44 (MetaMask, etc.)" },
    { name: "Ledger", path: "m/44'/60'/0'/0", type: "evm", description: "Ledger Live" },
    { name: "Ledger Legacy", path: "m/44'/60'/0'", type: "evm", description: "Ledger Legacy" },
  ],
  solana: [
    { name: "Phantom", path: "m/44'/501'/0'/0'", type: "solana", description: "Phantom, Solflare default" },
    { name: "Sollet", path: "m/44'/501'/0'", type: "solana", description: "Sollet, deprecated" },
    { name: "CLI", path: "m/44'/501'", type: "solana", description: "Solana CLI default" },
  ],
  tron: [
    { name: "Default", path: "m/44'/195'/0'/0/0", type: "tron", description: "Standard TronLink" },
    { name: "Ledger", path: "m/44'/195'/0'/0", type: "tron", description: "Ledger" },
  ],
  bitcoin: [
    { name: "Native SegWit", path: "m/84'/0'/0'/0/0", type: "bitcoin", description: "BIP84 bc1q... (recommended)" },
    { name: "SegWit", path: "m/49'/0'/0'/0/0", type: "bitcoin", description: "BIP49 3... (P2SH-P2WPKH)" },
    { name: "Legacy", path: "m/44'/0'/0'/0/0", type: "bitcoin", description: "BIP44 1... (P2PKH)" },
    { name: "Taproot", path: "m/86'/0'/0'/0/0", type: "bitcoin", description: "BIP86 bc1p... (P2TR)" },
  ],
  litecoin: [
    { name: "Native SegWit", path: "m/84'/2'/0'/0/0", type: "litecoin", description: "BIP84 ltc1q..." },
    { name: "Legacy", path: "m/44'/2'/0'/0/0", type: "litecoin", description: "BIP44 L..." },
  ],
  dogecoin: [
    { name: "Default", path: "m/44'/3'/0'/0/0", type: "dogecoin", description: "BIP44 D..." },
  ],
  cosmos: [
    { name: "Default", path: "m/44'/118'/0'/0/0", type: "cosmos", description: "Cosmos Hub cosmos1..." },
  ],
  aptos: [
    { name: "Default", path: "m/44'/637'/0'/0'/0'", type: "aptos", description: "Aptos 0x..." },
  ],
  sui: [
    { name: "Default", path: "m/44'/784'/0'/0'/0'", type: "sui", description: "Sui 0x..." },
  ],
  ton: [
    { name: "Wallet V4R2", path: "TON scheme", type: "ton", description: "Standard TON Wallet V4R2 (UQ...)" },
  ],
  near: [
    { name: "Default", path: "m/44'/397'/0'", type: "near", description: "Near implicit account" },
  ],
  polkadot: [
    { name: "Root (sr25519)", path: "root account", type: "polkadot", description: "Root account of the mnemonic, sr25519/SS58" },
  ],
  xrp: [
    { name: "Default", path: "m/44'/144'/0'/0/0", type: "xrp", description: "XRP r..." },
  ],
  stellar: [
    { name: "Default", path: "m/44'/148'/0'", type: "stellar", description: "Stellar G..." },
  ],
  cardano: [
    { name: "CIP-1852", path: "m/1852'/1815'/<account>'", type: "cardano", description: "Cardano base address addr1... (CIP-1852)" },
  ],
};
