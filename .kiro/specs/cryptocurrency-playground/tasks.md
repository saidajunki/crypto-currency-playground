# Implementation Plan: Cryptocurrency Playground

## Overview

TypeScriptで教育用暗号通貨シミュレーション環境を実装する。コア機能から順に構築し、各コンポーネントをテストで検証しながら進める。

## Tasks

- [ ] 1. プロジェクトセットアップ
  - TypeScriptプロジェクト初期化（tsconfig.json, package.json）
  - 依存関係インストール: crypto-js（ハッシュ）, elliptic（署名）, fast-check（PBT）, vitest（テスト）
  - ディレクトリ構造作成: src/, src/types/, data/
  - _Requirements: 全体_

- [ ] 2. Block実装
  - [ ] 2.1 Blockクラス実装
    - IBlockインターフェース定義
    - Block クラス（index, timestamp, transactions, previousHash, nonce, hash）
    - calculateHash()メソッド（SHA-256使用）
    - toJSON() / fromJSON() メソッド
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [ ]* 2.2 Property test: Block hash determinism
    - **Property 1: Block Hash Determinism**
    - **Validates: Requirements 1.1**
  - [ ]* 2.3 Property test: Block hash sensitivity
    - **Property 2: Block Hash Sensitivity**
    - **Validates: Requirements 1.2**
  - [ ]* 2.4 Property test: Block serialization round-trip
    - **Property 3: Block Serialization Round-Trip**
    - **Validates: Requirements 1.4**

- [ ] 3. Transaction実装
  - [ ] 3.1 Transactionクラス実装
    - ITransactionインターフェース定義
    - Transaction クラス（sender, recipient, amount, timestamp, signature）
    - calculateHash()メソッド
    - sign() / isValid() メソッド（elliptic使用）
    - toJSON() / fromJSON() メソッド
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 4. Wallet実装
  - [ ] 4.1 Walletクラス実装
    - IWalletインターフェース定義
    - Wallet クラス（publicKey, privateKey）
    - generate() 静的メソッド（secp256k1鍵ペア生成）
    - sign() / verify() メソッド
    - getAddress() メソッド
    - export() / import() メソッド
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [ ]* 4.2 Property test: Transaction signature validity
    - **Property 7: Transaction Signature Validity**
    - **Validates: Requirements 3.2, 3.3**
  - [ ]* 4.3 Property test: Transaction signature rejection
    - **Property 8: Transaction Signature Rejection for Wrong Key**
    - **Validates: Requirements 3.4**
  - [ ]* 4.4 Property test: Wallet key generation
    - **Property 10: Wallet Key Generation**
    - **Validates: Requirements 4.1**
  - [ ]* 4.5 Property test: Wallet export/import round-trip
    - **Property 11: Wallet Export/Import Round-Trip**
    - **Validates: Requirements 4.5**

- [ ] 5. Checkpoint - コアコンポーネント確認
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Miner実装
  - [ ] 6.1 Minerクラス実装
    - IMinerインターフェース定義
    - Miner クラス（difficulty）
    - mine() メソッド（Proof of Work実装）
    - マイニング結果（nonce, hash, attempts, timeMs）を返す
    - _Requirements: 5.1, 5.2, 5.4, 5.5_
  - [ ]* 6.2 Property test: Mining produces valid hash
    - **Property 12: Mining Produces Valid Hash**
    - **Validates: Requirements 5.1, 5.2**

- [ ] 7. Blockchain実装
  - [ ] 7.1 Blockchainクラス実装
    - IBlockchainインターフェース定義
    - Blockchain クラス（chain, pendingTransactions, difficulty, miningReward）
    - createGenesisBlock() メソッド
    - getLatestBlock() メソッド
    - addTransaction() メソッド（署名検証、残高チェック含む）
    - minePendingTransactions() メソッド
    - isChainValid() メソッド
    - getBalanceOfAddress() メソッド
    - getTransactionHistory() メソッド
    - toJSON() / fromJSON() メソッド
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.5, 5.3, 6.1, 6.2, 6.3_
  - [ ]* 7.2 Property test: Chain linking integrity
    - **Property 4: Chain Linking Integrity**
    - **Validates: Requirements 2.2**
  - [ ]* 7.3 Property test: Chain validation correctness
    - **Property 5: Chain Validation Correctness**
    - **Validates: Requirements 2.3, 2.4**
  - [ ]* 7.4 Property test: Pending transactions lifecycle
    - **Property 6: Pending Transactions Lifecycle**
    - **Validates: Requirements 2.5, 5.3**
  - [ ]* 7.5 Property test: Invalid transaction rejection
    - **Property 9: Invalid Transaction Rejection**
    - **Validates: Requirements 3.5, 6.2**
  - [ ]* 7.6 Property test: Balance calculation correctness
    - **Property 13: Balance Calculation Correctness**
    - **Validates: Requirements 6.1**
  - [ ]* 7.7 Property test: Transaction history completeness
    - **Property 14: Transaction History Completeness**
    - **Validates: Requirements 6.3**

- [ ] 8. Checkpoint - Blockchain機能確認
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Storage実装
  - [ ] 9.1 FileStorageクラス実装
    - IStorageインターフェース定義
    - FileStorage クラス（dataDir）
    - save() / load() メソッド（Blockchain永続化）
    - saveWallet() / loadWallet() / listWallets() メソッド
    - _Requirements: 7.4_
  - [ ]* 9.2 Property test: Blockchain persistence round-trip
    - **Property 15: Blockchain Persistence Round-Trip**
    - **Validates: Requirements 7.4**

- [ ] 10. CLI実装
  - [ ] 10.1 CLIコマンド実装
    - コマンドパーサー実装
    - help - コマンド一覧表示
    - wallet create <name> - ウォレット作成
    - wallet list - ウォレット一覧
    - wallet balance <name> - 残高確認
    - send <from> <to> <amount> - 送金
    - mine <wallet> - マイニング実行
    - chain - ブロックチェーン表示
    - pending - 保留中トランザクション表示
    - _Requirements: 7.1, 7.2, 7.3_
  - [ ]* 10.2 Unit tests: CLI command parsing
    - 各コマンドの正常系・異常系テスト
    - _Requirements: 7.2, 7.3_

- [ ] 11. Final Checkpoint - 全機能確認
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- 難易度はデフォルト2（ハッシュ先頭2文字が"00"）で軽量に設定
- fast-checkでのプロパティテストは100回イテレーション
- データはdata/ディレクトリにJSON形式で保存
