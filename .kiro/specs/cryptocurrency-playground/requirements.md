# Requirements Document

## Introduction

仮想通貨・暗号通貨の仕組みを学習するための教育用playground環境。TypeScriptで実装し、ローカルPC上でブロックチェーンの基本概念（ブロック、トランザクション、マイニング、ウォレット）を体験・理解できるようにする。

## Glossary

- **Block**: トランザクションのまとまりとメタデータ（ハッシュ、前ブロックへの参照、タイムスタンプ等）を含むデータ構造
- **Blockchain**: Blockが連鎖的に繋がったデータ構造。各ブロックは前のブロックのハッシュを参照する
- **Transaction**: 送金者、受取者、金額を含む取引データ
- **Wallet**: 公開鍵と秘密鍵のペアを管理し、トランザクションの署名・検証を行うコンポーネント
- **Mining**: 新しいブロックを生成するためのProof of Work計算プロセス
- **Hash**: データを固定長の文字列に変換する暗号学的関数の出力
- **Nonce**: マイニング時にハッシュ条件を満たすために調整される数値
- **Difficulty**: マイニングの難易度を決定するパラメータ（ハッシュの先頭に必要なゼロの数）

## Requirements

### Requirement 1: ブロックの作成と管理

**User Story:** As a 学習者, I want to ブロックを作成してその構造を確認する, so that ブロックチェーンの基本単位を理解できる.

#### Acceptance Criteria

1. WHEN a Block is created with transactions, timestamp, and previous hash, THE Block SHALL generate a unique hash based on its contents
2. WHEN the Block contents are modified, THE Block SHALL produce a different hash value
3. THE Block SHALL contain index, timestamp, transactions array, previous hash, nonce, and hash fields
4. WHEN a Block is serialized to JSON, THE Block SHALL be deserializable back to an equivalent Block object

### Requirement 2: ブロックチェーンの構築

**User Story:** As a 学習者, I want to 複数のブロックを連鎖させてチェーンを構築する, so that ブロックチェーンの不変性と整合性を理解できる.

#### Acceptance Criteria

1. WHEN a Blockchain is initialized, THE Blockchain SHALL create a genesis block as the first block
2. WHEN a new Block is added, THE Blockchain SHALL set the new block's previous hash to the last block's hash
3. WHEN the Blockchain is validated, THE Blockchain SHALL verify that each block's previous hash matches the preceding block's hash
4. WHEN any Block in the chain is tampered with, THE Blockchain validation SHALL detect the inconsistency and return invalid
5. THE Blockchain SHALL maintain a list of pending transactions that are not yet included in a block

### Requirement 3: トランザクションの作成と検証

**User Story:** As a 学習者, I want to トランザクションを作成して署名・検証する, so that 暗号通貨の送金の仕組みを理解できる.

#### Acceptance Criteria

1. WHEN a Transaction is created, THE Transaction SHALL contain sender address, recipient address, amount, timestamp, and signature fields
2. WHEN a Transaction is signed with a private key, THE Transaction SHALL store the digital signature
3. WHEN a signed Transaction is verified with the sender's public key, THE Transaction verification SHALL return true for valid signatures
4. WHEN a Transaction signature is verified with a different public key, THE Transaction verification SHALL return false
5. IF a Transaction has an invalid signature, THEN THE Blockchain SHALL reject adding it to pending transactions

### Requirement 4: ウォレットの管理

**User Story:** As a 学習者, I want to ウォレットを作成して鍵ペアを管理する, so that 公開鍵暗号の仕組みを理解できる.

#### Acceptance Criteria

1. WHEN a Wallet is created, THE Wallet SHALL generate a new public/private key pair
2. THE Wallet SHALL provide a method to sign data using the private key
3. THE Wallet SHALL provide a method to verify signatures using the public key
4. WHEN a Wallet is exported, THE Wallet SHALL serialize the key pair to a storable format
5. WHEN a Wallet is imported from exported data, THE Wallet SHALL restore the original key pair

### Requirement 5: マイニング（Proof of Work）

**User Story:** As a 学習者, I want to マイニングを実行して新しいブロックを生成する, so that Proof of Workの仕組みを理解できる.

#### Acceptance Criteria

1. WHEN mining is initiated, THE Miner SHALL find a nonce that produces a hash meeting the difficulty requirement
2. WHEN difficulty is set to N, THE Miner SHALL find a hash starting with N zeros
3. WHEN a block is successfully mined, THE Blockchain SHALL add the block to the chain and clear pending transactions
4. THE Mining difficulty SHALL be configurable to allow quick execution on low-performance machines
5. WHEN mining completes, THE Miner SHALL report the number of attempts and time taken

### Requirement 6: 残高の計算

**User Story:** As a 学習者, I want to アドレスの残高を確認する, so that UTXOモデルまたはアカウントモデルの仕組みを理解できる.

#### Acceptance Criteria

1. WHEN querying balance for an address, THE Blockchain SHALL calculate the sum of all incoming transactions minus outgoing transactions
2. WHEN a Transaction is created with amount exceeding sender's balance, THE Blockchain SHALL reject the transaction
3. THE Blockchain SHALL provide a method to get the transaction history for a specific address

### Requirement 7: CLIまたはREPL環境

**User Story:** As a 学習者, I want to コマンドラインから操作できる, so that インタラクティブに仮想通貨の仕組みを試せる.

#### Acceptance Criteria

1. WHEN the CLI starts, THE System SHALL display available commands and usage instructions
2. THE CLI SHALL provide commands for: creating wallets, viewing balances, creating transactions, mining blocks, and viewing the blockchain
3. WHEN an invalid command is entered, THE CLI SHALL display an error message with correct usage
4. THE CLI SHALL persist blockchain state between sessions using local file storage
