# MYChecker

Мультичейн-чекер: выводит адреса и балансы из сид-фразы или приватного ключа.
**36 сетей**, всё считается локально — наружу уходят только публичные адреса.

## Требования

- **bun** >= 1.0 (обязателен: код на TypeScript с импортами без расширений)
- Ubuntu 22.04+ / любой Linux, macOS, Windows

## Быстрая установка на Ubuntu

```bash
# 1. bun (если ещё не установлен)
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc          # или перезайдите в шелл

# 2. код
git clone https://github.com/YOUR_GITHUB_USERNAME/MYChecker.git
cd MYChecker

# 3. зависимости
bun install

# 4. (необязательно) команда mychecker в PATH
bun link

# 5. проверка
mychecker --help          # или: bun mychecker.ts --help
```

Либо одной командой: `bash install.sh`

## Загрузка на GitHub (первый раз)

Создайте на GitHub **пустой** репозиторий `MYChecker` (без README и .gitignore),
затем на машине, где установлен git:

```bash
cd MYChecker
git init
git add .
git commit -m "MYChecker 1.0.0 — мультичейн-чекер, 36 сетей"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/MYChecker.git
git push -u origin main
```

`.gitignore` уже исключает `node_modules/` и файлы конфигурации с API-ключами,
так что ключи в репозиторий не попадут. `bun.lock` наоборот включён — он
обеспечивает одинаковые версии зависимостей на сервере.

## Использование

```bash
# адреса по мнемонике (без обращения к сети)
mychecker "ваша мнемоника" --paths

# балансы по всем 36 сетям
mychecker "ваша мнемоника" --check

# только конкретная сеть
mychecker "ваша мнемоника" --check --network ton
mychecker "ваша мнемоника" --check --network scroll

# группа сетей
mychecker "ваша мнемоника" --check --type evm

# несколько аккаунтов и JSON для дальнейшей обработки
mychecker "ваша мнемоника" --accounts 5 --json

# приватный ключ вместо мнемоники
mychecker <hex_или_WIF_или_base58> --check
```

Если команда не в PATH — запускайте как `bun mychecker.ts ...` из папки репозитория.

## Сети (36)

| Семейство | Сети | Источник баланса |
|---|---|---|
| EVM, 22 шт. | ethereum, bsc, polygon, arbitrum, optimism, avalanche, fantom, base, zksync, linea, scroll, mantle, celo, gnosis, blast, opbnb, polygonzkevm, cronos, aurora, zora, ink, bera | публичные RPC (`eth_getBalance`) |
| Solana | solana | api.mainnet-beta.solana.com |
| Tron | tron | trongrid |
| Биткоин-семейство | bitcoin, litecoin, dogecoin | mempool.space; BlockCypher |
| Cosmos | cosmos | cosmos-rest.publicnode.com |
| Aptos | aptos | aptoslabs fullnode |
| Sui | sui | sui-rpc.publicnode.com |
| **TON (Gram)** | ton | toncenter.com |
| Near | near | rpc.mainnet.near.org |
| Polkadot | polkadot | polkadot-rpc.publicnode.com |
| XRP | xrp | xrplcluster.com |
| Stellar | stellar | horizon.stellar.org |
| Cardano | cardano | api.koios.rest |

## Ключи API (необязательно)

Публичные эндпоинты работают без ключей, но имеют лимиты. Для интенсивного
использования:

```bash
mychecker --init-config          # создаст mychecker.config.json
```

Файл ищется в: `./mychecker.config.json`, `./.mycheckerrc`, `~/.mychecker.json`,
`~/.config/mychecker/config.json` (или путь через `--config`).

Поддерживаются ключи: `etherscan`, `bscscan`, `polygonscan`, `arbiscan`,
`optimism`, `basescan`, `solscan`, `trongrid`, `blockchair`, `debank`.
С ключом Blockchair Биткоин проверяется через него, без ключа — через mempool.space.

## Безопасность

- Сид-фраза или ключ передаются **аргументом командной строки** и видны в
  списке процессов (`ps aux`). На общем сервере это риск. Используйте
  отдельный кошелёк без средств либо запускайте в закрытой сессии.
- `--show-keys` печатает приватные ключи в открытом виде.
- `--insecure` отключает проверку TLS-сертификатов — не используйте без нужды.
- Ничего не записывается на диск: наружу уходят **только публичные адреса**.
- Не вводите сид-фразу от кошелька с реальными средствами. Для таких активов
  используйте аппаратный кошелёк.

## Отличия от исходного пакета

Основано на `cryptochecker@1.0.1` (MIT). Что исправлено в этой версии:

**Неверная криптография адресов (адреса не принадлежали вашей фразе):**

| Сеть | Было | Стало |
|---|---|---|
| TON | `"UQ" + base58(sha256(pubkey))` — не TON-адрес | Wallet V4R2: `HMAC-SHA512` → `PBKDF2(100000)` → адрес контракта |
| Polkadot | secp256k1 + base58 без контрольной суммы | sr25519 (Schnorrkel) + SS58 |
| Cardano | BIP44 + SHA-256, адрес без заголовка (28 байт) | BIP32-Ed25519, CIP-1852, base-адрес |
| Sui | SHA-256 вместо BLAKE2b-256 | BLAKE2b-256 |
| Aptos | SHA-256 вместо SHA3-256 | SHA3-256 |

**Мёртвые эндпоинты (показывали ложный ноль):**

| Сеть | Было | Стало |
|---|---|---|
| Sui | публичный JSON-RPC отключён | sui-rpc.publicnode.com |
| Aptos | легаси-ресурс `CoinStore` (404) | `/accounts/{addr}/balance/...` |
| Bitcoin, Litecoin, Dogecoin | Blockchair (бан IP без ключа) | mempool.space, BlockCypher |
| Polkadot | метод `system.account` удалён из нод | `state_getStorage` |

**Молчаливые нули убраны во всех функциях баланса** (Sui, Aptos, TON, Polkadot,
Cardano, Solana, Tron, Bitcoin, Litecoin, Dogecoin, Cosmos, Near, XRP, Stellar).
Теперь «аккаунт ещё не создан» (честный 0) отличается от «API не отвечает»
(ошибка в разделе `Errors`), а не выглядит как пустой кошелёк.

**Добавлено 12 EVM-сетей:** scroll, mantle, celo, gnosis, blast, opbnb,
polygonzkevm, cronos, aurora, zora, ink, bera. Также заменён нерабочий RPC Polygon.

## Лицензия

MIT — см. [LICENSE](LICENSE). Исходный проект: `cryptochecker` (автор asim),
лицензия MIT.
