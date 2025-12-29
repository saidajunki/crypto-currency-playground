# Design Document: Cryptocurrency Playground

## Overview

教育目的の暗号通貨シミュレーション環境をTypeScriptで実装する。Bitcoinの基本的な仕組みを簡略化し、ローカルPC上で動作する軽量な実装とする。

主要コンポーネント：
- Block / Blockchain - データ構造とチェーン管理
- Transaction - 送金データと署名
- Wallet - 鍵ペア管理
- Miner - Proof of Work実装
- CLI - インタラクティブ操作環境

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        CLI Layer                         │
│  (コマンド解析、ユーザー入力処理、結果表示)              │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Blockchain Service                    │
│  (チェーン管理、トランザクション検証、残高計算)          │
└─────────────────────────────────────────────────────────┘
        │              │              │              │
        ▼              ▼              ▼              ▼
┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐
│   Block   │  │Transaction│  │  Wallet   │  │   Miner   │
│           │  │           │  │           │  │           │
│ - index   │  │ - sender  │  │ - pubKey  │  │ - mine()  │
│ - hash    │  │ - recipient│ │ - privKey │  │ - diff    │
│ - prevHash│  │ - amount  │  │ - sign()  │  │           │
│ - nonce   │  │ - signature│ │ - verify()│  │           │
│ - txs     │  │           │  │           │  │           │
└───────────┘  └───────────┘  └───────────┘  └───────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Storage Layer                         │
│  (JSONファイルによる永続化)                              │
└─────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Block

```typescript
interface IBlock {
  index: number;
  timestamp: number;
  transactions: ITransaction[];
  previousHash: string;
  nonce: number;
  hash: string;
}

class Block implements IBlock {
  constructor(
    index: number,
    timestamp: number,
    transactions: ITransaction[],
    previousHash: string
  );
  
  calculateHash(): string;
  toJSON(): object;
  static fromJSON(json: object): Block;
}
```

### Transaction

```typescript
interface ITransaction {
  sender: string;      // 送信者の公開鍵（アドレス）
  recipient: string;   // 受信者の公開鍵（アドレス）
  amount: number;
  timestamp: number;
  signature?: string;
}

class Transaction implements ITransaction {
  constructor(sender: string, recipient: string, amount: number);
  
  calculateHash(): string;
  sign(privateKey: string): void;
  isValid(): boolean;
  toJSON(): object;
  static fromJSON(json: object): Transaction;
}
```

### Wallet

```typescript
interface IWallet {
  publicKey: string;
  privateKey: string;
}

class Wallet implements IWallet {
  constructor();
  
  static generate(): Wallet;
  static fromPrivateKey(privateKey: string): Wallet;
  
  sign(data: string): string;
  static verify(publicKey: string, data: string, signature: string): boolean;
  
  getAddress(): string;
  export(): string;
  static import(data: string): Wallet;
}
```

### Blockchain

```typescript
interface IBlockchain {
  chain: IBlock[];
  pendingTransactions: ITransaction[];
  difficulty: number;
  miningReward: number;
}

class Blockchain implements IBlockchain {
  constructor(difficulty?: number);
  
  createGenesisBlock(): Block;
  getLatestBlock(): Block;
  addTransaction(transaction: Transaction): boolean;
  minePendingTransactions(minerAddress: string): Block;
  isChainValid(): boolean;
  getBalanceOfAddress(address: string): number;
  getTransactionHistory(address: string): ITransaction[];
  
  toJSON(): object;
  static fromJSON(json: object): Blockchain;
}
```

### Miner

```typescript
interface IMiner {
  difficulty: number;
}

class Miner implements IMiner {
  constructor(difficulty: number);
  
  mine(block: Block): { nonce: number; hash: string; attempts: number; timeMs: number };
}
```

### Storage

```typescript
interface IStorage {
  save(blockchain: Blockchain): void;
  load(): Blockchain | null;
  saveWallet(wallet: Wallet, name: string): void;
  loadWallet(name: string): Wallet | null;
  listWallets(): string[];
}

class FileStorage implements IStorage {
  constructor(dataDir: string);
  // 実装
}
```

## Data Models

### Block Data Structure

```json
{
  "index": 0,
  "timestamp": 1703836800000,
  "transactions": [],
  "previousHash": "0",
  "nonce": 0,
  "hash": "abc123..."
}
```

### Transaction Data Structure

```json
{
  "sender": "04a1b2c3...",
  "recipient": "04d4e5f6...",
  "amount": 100,
  "timestamp": 1703836800000,
  "signature": "3045..."
}
```

### Blockchain State File

```json
{
  "chain": [...],
  "pendingTransactions": [...],
  "difficulty": 2,
  "miningReward": 100
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Block Hash Determinism
*For any* Block with given index, timestamp, transactions, previousHash, and nonce, calculating the hash multiple times SHALL always produce the same hash value.
**Validates: Requirements 1.1**

### Property 2: Block Hash Sensitivity
*For any* Block, if any of its contents (index, timestamp, transactions, previousHash, or nonce) is modified, the resulting hash SHALL be different from the original hash.
**Validates: Requirements 1.2**

### Property 3: Block Serialization Round-Trip
*For any* valid Block, serializing to JSON and then deserializing SHALL produce a Block with equivalent field values.
**Validates: Requirements 1.4**

### Property 4: Chain Linking Integrity
*For any* sequence of Blocks added to a Blockchain, each Block's previousHash SHALL equal the hash of the immediately preceding Block.
**Validates: Requirements 2.2**

### Property 5: Chain Validation Correctness
*For any* valid Blockchain, validation SHALL return true. *For any* Blockchain where any Block's data has been tampered with (hash recalculated), validation SHALL return false.
**Validates: Requirements 2.3, 2.4**

### Property 6: Pending Transactions Lifecycle
*For any* Blockchain, transactions added via addTransaction SHALL appear in pendingTransactions. After mining, those transactions SHALL be in the new Block and pendingTransactions SHALL be empty.
**Validates: Requirements 2.5, 5.3**

### Property 7: Transaction Signature Validity
*For any* Transaction signed with a Wallet's private key, verifying the signature with the same Wallet's public key SHALL return true.
**Validates: Requirements 3.2, 3.3**

### Property 8: Transaction Signature Rejection for Wrong Key
*For any* Transaction signed with Wallet A's private key, verifying the signature with Wallet B's public key (where A ≠ B) SHALL return false.
**Validates: Requirements 3.4**

### Property 9: Invalid Transaction Rejection
*For any* Transaction with an invalid signature OR with amount exceeding sender's balance, the Blockchain SHALL reject adding it to pending transactions.
**Validates: Requirements 3.5, 6.2**

### Property 10: Wallet Key Generation
*For any* newly created Wallet, it SHALL have non-empty publicKey and privateKey, and signing then verifying any data SHALL succeed.
**Validates: Requirements 4.1**

### Property 11: Wallet Export/Import Round-Trip
*For any* Wallet, exporting and then importing SHALL produce a Wallet with the same publicKey and privateKey.
**Validates: Requirements 4.5**

### Property 12: Mining Produces Valid Hash
*For any* Block and difficulty N, mining SHALL produce a nonce such that the resulting hash starts with N zeros.
**Validates: Requirements 5.1, 5.2**

### Property 13: Balance Calculation Correctness
*For any* address and any set of confirmed transactions, the balance SHALL equal the sum of amounts where address is recipient minus the sum of amounts where address is sender.
**Validates: Requirements 6.1**

### Property 14: Transaction History Completeness
*For any* address, getTransactionHistory SHALL return all and only transactions where the address is either sender or recipient.
**Validates: Requirements 6.3**

### Property 15: Blockchain Persistence Round-Trip
*For any* Blockchain state, saving to file and loading SHALL produce a Blockchain with equivalent chain, pendingTransactions, difficulty, and miningReward.
**Validates: Requirements 7.4**

## Error Handling

### Block Errors
- Invalid hash format: Throw `InvalidHashError`
- Missing required fields: Throw `InvalidBlockError`

### Transaction Errors
- Invalid signature: Return false from `isValid()`, reject in `addTransaction()`
- Insufficient balance: Throw `InsufficientBalanceError`
- Invalid amount (negative or zero): Throw `InvalidAmountError`

### Wallet Errors
- Invalid private key format: Throw `InvalidKeyError`
- Corrupted export data: Throw `WalletImportError`

### Blockchain Errors
- Chain validation failure: Return false from `isChainValid()`
- Genesis block tampering: Detected in validation

### Storage Errors
- File not found: Return null from `load()`
- Corrupted data: Throw `StorageCorruptedError`
- Write failure: Throw `StorageWriteError`

## Testing Strategy

### Property-Based Testing

Property-based testing library: **fast-check** (TypeScriptで最も成熟したPBTライブラリ)

各プロパティテストは最低100回のイテレーションで実行する。

テストファイル構成:
- `src/block.test.ts` - Block関連プロパティ (1, 2, 3)
- `src/blockchain.test.ts` - Blockchain関連プロパティ (4, 5, 6, 9, 13, 14)
- `src/transaction.test.ts` - Transaction関連プロパティ (7, 8)
- `src/wallet.test.ts` - Wallet関連プロパティ (10, 11)
- `src/miner.test.ts` - Mining関連プロパティ (12)
- `src/storage.test.ts` - Storage関連プロパティ (15)

### Unit Tests

ユニットテストはエッジケースと具体例に焦点を当てる:
- Genesis block creation
- Empty transaction list handling
- Zero balance scenarios
- Maximum difficulty edge cases
- CLI command parsing

### Test Generators (fast-check)

```typescript
// Transaction generator
const transactionArb = fc.record({
  sender: fc.hexaString({ minLength: 64, maxLength: 64 }),
  recipient: fc.hexaString({ minLength: 64, maxLength: 64 }),
  amount: fc.integer({ min: 1, max: 1000000 }),
  timestamp: fc.integer({ min: 0 })
});

// Block generator
const blockArb = fc.record({
  index: fc.nat(),
  timestamp: fc.integer({ min: 0 }),
  transactions: fc.array(transactionArb, { maxLength: 10 }),
  previousHash: fc.hexaString({ minLength: 64, maxLength: 64 }),
  nonce: fc.nat()
});

// Wallet pair generator (for signature tests)
const walletPairArb = fc.tuple(
  fc.constant(Wallet.generate()),
  fc.constant(Wallet.generate())
).filter(([a, b]) => a.publicKey !== b.publicKey);
```

