// ═══════════════════════════════════════════════════════════════════════════════
// BALANCE CHECKING
// ═══════════════════════════════════════════════════════════════════════════════

import type { BalanceResult, DerivedAddress, UserConfig, ApiKeyConfig } from "./types";
import { NETWORKS } from "./networks";
import { decodeAddress, xxhashAsU8a, blake2AsU8a } from "@polkadot/util-crypto";
import { u8aConcat } from "@polkadot/util";

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

async function rawFetchOnce(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

export function formatBalance(balance: bigint, decimals: number): string {
  if (balance === 0n) return "0";
  const divisor = BigInt(10 ** decimals);
  const whole = balance / divisor;
  const fraction = balance % divisor;
  const fractionStr = fraction.toString().padStart(decimals, "0").slice(0, 8);
  const result = `${whole}.${fractionStr}`.replace(/\.?0+$/, "");
  return result || "0";
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVM BALANCE
// ═══════════════════════════════════════════════════════════════════════════════

// Etherscan V2 - a single endpoint for every chain included in the plan.
// The old per-explorer endpoints (api.bscscan.com/api and alike) are V1 and
// Etherscan shut them down, so one etherscan key now serves any chain with a chainId.
export async function getEVMBalanceWithApi(
  address: string,
  networkKey: string,
  config: UserConfig
): Promise<{ balance: bigint; source: string } | null> {
  const chainId = (NETWORKS as any)[networkKey]?.chainId;
  // The etherscan key covers the whole family; per-scanner keys are still read
  // for compatibility and used only when the shared key is absent.
  const apiKey =
    config.apiKeys?.etherscan ?? config.apiKeys?.[networkKey as keyof ApiKeyConfig] ?? null;
  if (!chainId || !apiKey) return null;

  try {
    const url =
      `https://api.etherscan.io/v2/api?chainid=${chainId}` +
      `&module=account&action=balance&address=${address}&tag=latest&apikey=${apiKey}`;
    const response = await fetchWithTimeout(url, { method: "GET" });
    if (!response.ok) return null;
    const data = await response.json();
    // status !== "1" means the chain is not in the plan - fall back to the RPC
    if (data.status !== "1") return null;
    return { balance: BigInt(data.result), source: "etherscan v2" };
  } catch {
    return null; // any failure here still leaves the RPC path available
  }
}

// --- Network layer: per-host throttling and retries so public APIs do not ban the IP ---
// Tunable via environment variables:
//   MYCHECKER_HOST_DELAY_MS - pause between requests to the same host (default 400)
//   MYCHECKER_RETRIES       - retry attempts on rate limit or failure (default 3)
const HOST_DELAY_MS = Number(process.env.MYCHECKER_HOST_DELAY_MS ?? 400);
const MAX_RETRIES = Number(process.env.MYCHECKER_RETRIES ?? 3);
const USER_AGENT = "MYChecker/1.0 (multi-chain balance checker)";

const lastRequestAt = new Map<string, number>();
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 429 = rate limit, 403 = usually bot protection, 430 = Blockchair ban, 5xx = service failure
const isRetryableStatus = (status: number): boolean =>
  status === 429 || status === 403 || status === 430 || status >= 500;

// At most one request per host per HOST_DELAY_MS: request bursts are what cause bans
async function throttleHost(host: string): Promise<void> {
  const previous = lastRequestAt.get(host) ?? 0;
  const wait = previous + HOST_DELAY_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt.set(host, Date.now());
}

function retryDelay(attempt: number, retryAfterHeader: string | null): number {
  const after = Number(retryAfterHeader);
  if (Number.isFinite(after) && after > 0) return Math.min(60000, after * 1000);
  return Math.min(30000, 1000 * 2 ** attempt) + Math.floor(Math.random() * 500);
}

function withHeaders(options: RequestInit): RequestInit {
  return {
    ...options,
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
      ...((options.headers as Record<string, string> | undefined) ?? {}),
    },
  };
}

async function fetchWithTimeout(url: string, options: RequestInit, timeout = 15000): Promise<Response> {
  const host = new URL(url).host;
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    await throttleHost(host);
    try {
      const response = await rawFetchOnce(url, withHeaders(options), timeout);
      if (isRetryableStatus(response.status) && attempt < MAX_RETRIES) {
        await sleep(retryDelay(attempt, response.headers.get("retry-after")));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) {
        await sleep(retryDelay(attempt, null));
        continue;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Request failed");
}

// Try sources in order: if one is rate limited or down, move to the next
async function trySources<T>(sources: Array<() => Promise<T>>, label: string): Promise<T> {
  const errors: string[] = [];
  for (const source of sources) {
    try {
      return await source();
    } catch (error: any) {
      errors.push(error?.message ?? String(error));
    }
  }
  throw new Error(`${label}: all sources failed (${errors.join("; ").slice(0, 180)})`);
}

// RPC list: user config first, then the configured endpoint, then built-in fallbacks.
// https://<chainId>.rpc.thirdweb.com works for every EVM chain tested here, so it is
// always appended as a last-resort fallback.
function evmRpcs(networkConfig: any, networkKey: string | undefined, config: UserConfig): string[] {
  const custom = networkKey ? config.customRpcs?.[networkKey] ?? [] : [];
  const builtin = networkConfig?.rpcs ?? [];
  const primary = networkConfig?.rpc ? [networkConfig.rpc] : [];
  const thirdweb = networkConfig?.chainId
    ? [`https://${networkConfig.chainId}.rpc.thirdweb.com`]
    : [];
  return [...new Set([...custom, ...primary, ...builtin, ...thirdweb])];
}

function decimalToSmallest(value: string, decimals: number): bigint {
  const [whole, frac = ""] = String(value).trim().split(".");
  const padded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(padded || "0");
}

export async function getEVMBalanceAny(rpcs: string[], address: string): Promise<bigint> {
  return trySources(
    rpcs.map((rpc) => () => getEVMBalance(rpc, address)),
    "EVM"
  );
}
export async function getEVMBalance(rpc: string, address: string): Promise<bigint> {
  const response = await fetchWithTimeout(rpc, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_getBalance",
      params: [address, "latest"],
      id: 1,
    }),
  });
  
  const text = await response.text();
  
  // Check if response is valid JSON
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    // Response is not JSON (might be HTML error page)
    throw new Error(`Invalid response from RPC (status ${response.status})`);
  }
  
  if (data.error) {
    throw new Error(data.error.message || "RPC error");
  }
  
  return BigInt(data.result || "0");
}

export async function getDeBankPortfolio(address: string, apiKey: string): Promise<{
  totalUsd: number;
  chains: { chain: string; usdValue: number }[];
} | null> {
  try {
    const response = await fetchWithTimeout(
      `https://pro-openapi.debank.com/v1/user/total_balance?id=${address}`,
      { headers: { "AccessKey": apiKey } }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return {
      totalUsd: data.total_usd_value || 0,
      chains: (data.chain_list || []).map((c: any) => ({
        chain: c.name,
        usdValue: c.usd_value,
      })).filter((c: any) => c.usdValue > 0),
    };
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOLANA BALANCE
// ═══════════════════════════════════════════════════════════════════════════════

export async function getSolanaBalance(address: string): Promise<bigint> {
  const response = await fetchWithTimeout(NETWORKS.solana.rpc!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "getBalance",
      params: [address],
      id: 1,
    }),
  });
  const data = await response.json();
  if (data.error) {
    throw new Error(`Solana RPC error: ${data.error.message ?? JSON.stringify(data.error)}`);
  }
  return BigInt(data.result?.value || 0);
}

export async function getSolanaMultipleBalances(addresses: string[]): Promise<Map<string, bigint>> {
  const results = new Map<string, bigint>();
  const BATCH_SIZE = 100;
  
  for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
    const batch = addresses.slice(i, i + BATCH_SIZE);
    
    try {
      const response = await fetchWithTimeout(NETWORKS.solana.rpc!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "getMultipleAccounts",
          params: [batch, { encoding: "base64" }],
          id: 1,
        }),
      });
      
      const data = await response.json();
      
      if (data.result?.value) {
        data.result.value.forEach((account: any, index: number) => {
          results.set(batch[index], BigInt(account?.lamports || 0));
        });
      }
    } catch {
      for (const address of batch) {
        try {
          const balance = await getSolanaBalance(address);
          results.set(address, balance);
        } catch {
          results.set(address, 0n);
        }
      }
    }
  }
  
  return results;
}

export async function getSolscanBalance(address: string, apiKey: string): Promise<bigint | null> {
  try {
    const response = await fetchWithTimeout(
      `https://pro-api.solscan.io/v2.0/account/${address}`,
      { headers: { "token": apiKey } }
    );
    
    if (!response.ok) return null;
    const data = await response.json();
    return BigInt(data.data?.lamports || 0);
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRON BALANCE
// ═══════════════════════════════════════════════════════════════════════════════

export async function getTronBalance(address: string): Promise<bigint> {
  const response = await fetchWithTimeout(`https://api.trongrid.io/v1/accounts/${address}`, { method: "GET" });
  if (!response.ok) {
    throw new Error(`Tron API error: HTTP ${response.status}`);
  }
  const data = await response.json();
  if (data.success === false) {
    throw new Error(`Tron API error: ${data.error ?? "unknown"}`);
  }
  return BigInt(data.data?.[0]?.balance || 0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// BITCOIN FAMILY BALANCE
// ═══════════════════════════════════════════════════════════════════════════════

// Esplora-compatible source (mempool.space, blockstream.info): funded minus spent
// Esplora-compatible source (mempool.space, blockstream.info): funded minus spent
async function esploraBalance(base: string, address: string): Promise<bigint> {
  const response = await fetchWithTimeout(`${base}/api/address/${address}`, { method: "GET" });
  if (response.status === 404) return 0n; // address has no on-chain history yet
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (!data.chain_stats) throw new Error("unexpected response");
  return BigInt(data.chain_stats.funded_txo_sum || 0) - BigInt(data.chain_stats.spent_txo_sum || 0);
}

async function blockchainInfoBalance(address: string): Promise<bigint> {
  const response = await fetchWithTimeout(`https://blockchain.info/balance?active=${address}`, { method: "GET" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  const record = data?.[address];
  if (!record) throw new Error("unexpected response");
  return BigInt(record.final_balance || 0);
}

export async function getBitcoinBalance(address: string, apiKey?: string): Promise<bigint> {
  // Blockchair only works with a key (without one it bans shared IPs),
  // so the sources below are tried in order until one succeeds.
  const sources: Array<() => Promise<bigint>> = [];
  if (apiKey) {
    sources.push(async () => {
      const response = await fetchWithTimeout(
        `https://api.blockchair.com/bitcoin/dashboards/address/${address}?key=${apiKey}`,
        { method: "GET" }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.context?.error) throw new Error(data.context.error);
      return BigInt(data.data?.[address]?.address?.balance || 0);
    });
  }
  sources.push(() => esploraBalance("https://mempool.space", address));
  sources.push(() => esploraBalance("https://blockstream.info", address));
  sources.push(() => blockchainInfoBalance(address));
  return trySources(sources, "Bitcoin");
}

async function blockCypherBalance(chain: "ltc" | "doge", address: string): Promise<bigint> {
  const response = await fetchWithTimeout(
    `https://api.blockcypher.com/v1/${chain}/main/addrs/${address}/balance`,
    { method: "GET" }
  );
  if (response.status === 404) return 0n;
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (typeof data.balance !== "number") throw new Error("unexpected response");
  return BigInt(data.balance);
}

export async function getLitecoinBalance(address: string): Promise<bigint> {
  return trySources(
    [
      () => blockCypherBalance("ltc", address),
      () => esploraBalance("https://litecoinspace.org", address),
    ],
    "Litecoin"
  );
}

export async function getDogecoinBalance(address: string): Promise<bigint> {
  return trySources(
    [
      () => blockCypherBalance("doge", address),
      async () => {
        const response = await fetchWithTimeout(
          `https://dogechain.info/api/v1/address/balance/${address}`,
          { method: "GET" }
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (typeof data.balance !== "string") throw new Error("unexpected response");
        return decimalToSmallest(data.balance, 8);
      },
    ],
    "Dogecoin"
  );
}
// ═══════════════════════════════════════════════════════════════════════════════
// OTHER CHAIN BALANCES
// ═══════════════════════════════════════════════════════════════════════════════

export async function getCosmosBalance(address: string): Promise<bigint> {
  const lcds = [
    NETWORKS.cosmos.rpc!,
    "https://rest.cosmos.directory/cosmoshub",
    "https://cosmos-api.polkachu.com",
  ];
  return trySources(
    lcds.map((base) => async () => {
      const response = await fetchWithTimeout(`${base}/cosmos/bank/v1beta1/balances/${address}`, {
        method: "GET",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data.balances)) throw new Error("unexpected response");
      const uatom = data.balances.find((b: any) => b.denom === "uatom");
      return BigInt(uatom?.amount || 0);
    }),
    "Cosmos"
  );
}

export async function getAptosBalance(address: string): Promise<bigint> {
  const response = await fetchWithTimeout(
    `${NETWORKS.aptos.rpc}/accounts/${address}/balance/0x1::aptos_coin::AptosCoin`,
    { method: "GET" }
  );
  if (!response.ok) {
    throw new Error(`Aptos API error: HTTP ${response.status}`);
  }
  // Balance is returned as a bare number: read as text to keep precision on large amounts
  const raw = (await response.text()).trim();
  if (!/^\d+$/.test(raw)) {
    throw new Error(`Unexpected Aptos balance response: ${raw.slice(0, 80)}`);
  }
  return BigInt(raw);
}

export async function getSuiBalance(address: string): Promise<bigint> {
  const rpcs = [
    NETWORKS.sui.rpc!,
    "https://sui.publicnode.com",
    "https://sui-mainnet-endpoint.blockvision.org",
  ];
  return trySources(
    rpcs.map((rpc) => async () => {
      const response = await fetchWithTimeout(rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "suix_getBalance",
          params: [address, "0x2::sui::SUI"],
          id: 1,
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      if (!data.result) throw new Error("empty response");
      return BigInt(data.result.totalBalance ?? 0);
    }),
    "Sui"
  );
}

export async function getNearBalance(address: string): Promise<bigint> {
  const response = await fetchWithTimeout("https://rpc.mainnet.near.org", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "query",
      params: {
        request_type: "view_account",
        finality: "final",
        account_id: address,
      },
      id: 1,
    }),
  });
  const data = await response.json();
  if (data.error) {
    // An account that was never created is a legitimate zero, not a failure.
    const message = JSON.stringify(data.error);
    if (!/UNKNOWN_ACCOUNT|does not exist|not found/i.test(message)) {
      throw new Error(`Near RPC error: ${message.slice(0, 120)}`);
    }
    return 0n;
  }
  return BigInt(data.result?.amount || 0);
}

export async function getXrpBalance(address: string): Promise<bigint> {
  const response = await fetchWithTimeout("https://xrplcluster.com", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      method: "account_info",
      params: [{ account: address, ledger_index: "validated" }],
    }),
  });
  const data = await response.json();
  if (data.result?.error === "actNotFound") {
    return 0n; // account was never activated
  }
  if (data.result?.error) {
    throw new Error(`XRP RPC error: ${data.result.error_message ?? data.result.error}`);
  }
  return BigInt(data.result?.account_data?.Balance || 0);
}

export async function getStellarBalance(address: string): Promise<bigint> {
  const response = await fetchWithTimeout(
    `https://horizon.stellar.org/accounts/${address}`,
    { method: "GET" }
  );
  if (response.status === 404) return 0n; // account not created yet -> balance really is 0
  if (!response.ok) {
    throw new Error(`Stellar API error: HTTP ${response.status}`);
  }
  const data = await response.json();
  const native = data.balances?.find((b: any) => b.asset_type === "native");
  const balance = parseFloat(native?.balance || "0") * 10000000;
  return BigInt(Math.floor(balance));
}

export async function getTonBalance(address: string): Promise<bigint> {
  const response = await fetchWithTimeout(
    `${NETWORKS.ton.rpc}/getAddressInformation?address=${encodeURIComponent(address)}`,
    { method: "GET" }
  );
  if (!response.ok) {
    throw new Error(`TON API error: HTTP ${response.status}`);
  }
  const data = await response.json();
  if (!data.ok) {
    throw new Error(`TON API error: ${data.error ?? "unknown"}`);
  }
  if (!data.result) {
    throw new Error("TON API returned no result");
  }
  return BigInt(data.result.balance ?? 0);
}

export async function getPolkadotBalance(address: string): Promise<bigint> {
  // Storage key for System.Account: twox128("System") ++ twox128("Account")
  // ++ blake2_128_concat(accountId), i.e. blake2_128(accountId) ++ accountId.
  const accountId = decodeAddress(address);
  const storageKey =
    "0x" +
    Buffer.from(
      u8aConcat(
        xxhashAsU8a("System", 128),
        xxhashAsU8a("Account", 128),
        blake2AsU8a(accountId, 128),
        accountId
      )
    ).toString("hex");

  const response = await fetchWithTimeout(NETWORKS.polkadot.rpc!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "state_getStorage",
      params: [storageKey],
      id: 1,
    }),
  });
  if (!response.ok) {
    throw new Error(`Polkadot RPC error: HTTP ${response.status}`);
  }
  const data = await response.json();
  if (data.error) {
    throw new Error(`Polkadot RPC error: ${data.error.message}`);
  }
  if (!data.result) {
    return 0n; // no entry in storage means the account does not exist yet
  }
  const bytes = Buffer.from(String(data.result).slice(2), "hex");
  if (bytes.length < 32) {
    throw new Error(`Unexpected Polkadot AccountInfo length: ${bytes.length}`);
  }
  // AccountInfo = nonce, consumers, providers, sufficients (4 x u32 = 16 bytes),
  // then AccountData with free as a little-endian u128.
  return BigInt("0x" + Buffer.from(bytes.subarray(16, 32)).reverse().toString("hex"));
}

export async function getCardanoBalance(address: string): Promise<bigint> {
  const response = await fetchWithTimeout(`${NETWORKS.cardano.rpc}/address_info`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ _addresses: [address] }),
  });
  if (!response.ok) {
    throw new Error(`Koios API error: HTTP ${response.status}`);
  }
  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error("Unexpected Koios response");
  }
  if (data.length === 0) {
    return 0n; // address is not on chain yet
  }
  return BigInt(data[0].balance ?? 0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BALANCE CHECKER
// ═══════════════════════════════════════════════════════════════════════════════

export async function checkBalances(
  addresses: DerivedAddress[], 
  networks?: string[], 
  config: UserConfig = {}
): Promise<BalanceResult[]> {
  const results: BalanceResult[] = [];
  const checkedAddresses = new Map<string, Set<string>>();

  const isChecked = (type: string, address: string): boolean => {
    if (!checkedAddresses.has(type)) checkedAddresses.set(type, new Set());
    return checkedAddresses.get(type)!.has(address);
  };
  const markChecked = (type: string, address: string) => {
    if (!checkedAddresses.has(type)) checkedAddresses.set(type, new Set());
    checkedAddresses.get(type)!.add(address);
  };

  const debankKey = config.apiKeys?.debank;
  const checkedDeBank = new Set<string>();

  // Batch fetch Solana balances
  const solanaAddresses: string[] = [];
  for (const addr of addresses) {
    if (addr.type === "solana") {
      const shouldCheck = !networks || networks.length === 0 || networks.includes("solana");
      if (shouldCheck && !solanaAddresses.includes(addr.address)) {
        solanaAddresses.push(addr.address);
      }
    }
  }

  let solanaBalances: Map<string, bigint> | null = null;
  if (solanaAddresses.length > 1) {
    try {
      solanaBalances = await getSolanaMultipleBalances(solanaAddresses);
    } catch {
      // Will fall back to individual fetches
    }
  }

  for (const addr of addresses) {
    if (networks && networks.length > 0) {
      const networkKey = Object.entries(NETWORKS).find(([_, n]) => n.name === addr.network)?.[0];
      if (!networkKey || !networks.includes(networkKey)) continue;
    }

    try {
      let balance: bigint;
      let decimals: number;

      if (addr.type === "evm") {
        const networkEntry = Object.entries(NETWORKS).find(([_, n]) => n.name === addr.network);
        const networkKey = networkEntry?.[0];
        const networkConfig = networkEntry?.[1];
        
        const rpcList = evmRpcs(networkConfig, networkKey, config);
        if (rpcList.length === 0) continue;

        const cacheKey = `${addr.network}:${addr.address}`;
        if (isChecked("evm", cacheKey)) continue;
        markChecked("evm", cacheKey);

        if (debankKey && !checkedDeBank.has(addr.address)) {
          checkedDeBank.add(addr.address);
          const portfolio = await getDeBankPortfolio(addr.address, debankKey);
          if (portfolio && portfolio.totalUsd > 0) {
            results.push({
              network: "All EVM (DeBank)",
              address: addr.address,
              balance: `$${portfolio.totalUsd.toFixed(2)}`,
              symbol: "USD",
              hasBalance: true,
              usdValue: `$${portfolio.totalUsd.toFixed(2)}`,
            });
          }
        }

        if (networkKey) {
          const apiResult = await getEVMBalanceWithApi(addr.address, networkKey, config);
          if (apiResult) {
            balance = apiResult.balance;
          } else {
            balance = await getEVMBalanceAny(rpcList, addr.address);
          }
        } else {
          balance = await getEVMBalanceAny(rpcList, addr.address);
        }
        decimals = 18;
      } else if (addr.type === "solana") {
        if (isChecked("solana", addr.address)) continue;
        markChecked("solana", addr.address);

        const solscanKey = config.apiKeys?.solscan;
        if (solscanKey) {
          const apiBalance = await getSolscanBalance(addr.address, solscanKey);
          if (apiBalance !== null) {
            balance = apiBalance;
          } else if (solanaBalances?.has(addr.address)) {
            balance = solanaBalances.get(addr.address)!;
          } else {
            balance = await getSolanaBalance(addr.address);
          }
        } else if (solanaBalances?.has(addr.address)) {
          balance = solanaBalances.get(addr.address)!;
        } else {
          balance = await getSolanaBalance(addr.address);
        }
        decimals = 9;
      } else if (addr.type === "tron") {
        if (isChecked("tron", addr.address)) continue;
        markChecked("tron", addr.address);
        balance = await getTronBalance(addr.address);
        decimals = 6;
      } else if (addr.type === "bitcoin") {
        if (isChecked("bitcoin", addr.address)) continue;
        markChecked("bitcoin", addr.address);
        balance = await getBitcoinBalance(addr.address, config.apiKeys?.blockchair);
        decimals = 8;
      } else if (addr.type === "litecoin") {
        if (isChecked("litecoin", addr.address)) continue;
        markChecked("litecoin", addr.address);
        balance = await getLitecoinBalance(addr.address);
        decimals = 8;
      } else if (addr.type === "dogecoin") {
        if (isChecked("dogecoin", addr.address)) continue;
        markChecked("dogecoin", addr.address);
        balance = await getDogecoinBalance(addr.address);
        decimals = 8;
      } else if (addr.type === "cosmos") {
        if (isChecked("cosmos", addr.address)) continue;
        markChecked("cosmos", addr.address);
        balance = await getCosmosBalance(addr.address);
        decimals = 6;
      } else if (addr.type === "aptos") {
        if (isChecked("aptos", addr.address)) continue;
        markChecked("aptos", addr.address);
        balance = await getAptosBalance(addr.address);
        decimals = 8;
      } else if (addr.type === "sui") {
        if (isChecked("sui", addr.address)) continue;
        markChecked("sui", addr.address);
        balance = await getSuiBalance(addr.address);
        decimals = 9;
      } else if (addr.type === "near") {
        if (isChecked("near", addr.address)) continue;
        markChecked("near", addr.address);
        balance = await getNearBalance(addr.address);
        decimals = 24;
      } else if (addr.type === "xrp") {
        if (isChecked("xrp", addr.address)) continue;
        markChecked("xrp", addr.address);
        balance = await getXrpBalance(addr.address);
        decimals = 6;
      } else if (addr.type === "cardano") {
        if (isChecked("cardano", addr.address)) continue;
        markChecked("cardano", addr.address);
        balance = await getCardanoBalance(addr.address);
        decimals = 6;
      } else if (addr.type === "polkadot") {
        if (isChecked("polkadot", addr.address)) continue;
        markChecked("polkadot", addr.address);
        balance = await getPolkadotBalance(addr.address);
        decimals = 10;
      } else if (addr.type === "ton") {
        if (isChecked("ton", addr.address)) continue;
        markChecked("ton", addr.address);
        balance = await getTonBalance(addr.address);
        decimals = 9;
      } else if (addr.type === "stellar") {
        if (isChecked("stellar", addr.address)) continue;
        markChecked("stellar", addr.address);
        balance = await getStellarBalance(addr.address);
        decimals = 7;
      } else {
        continue;
      }

      const formattedBalance = formatBalance(balance, decimals);
      results.push({
        network: addr.network,
        address: addr.address,
        balance: formattedBalance,
        symbol: addr.symbol,
        hasBalance: balance > 0n && formattedBalance !== "0",
      });
    } catch (error: any) {
      results.push({
        network: addr.network,
        address: addr.address,
        balance: "Error",
        symbol: addr.symbol,
        hasBalance: false,
        error: error?.message || "Unknown error",
      });
    }
  }

  return results;
}
