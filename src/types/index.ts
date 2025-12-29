/**
 * 暗号通貨Playgroundの型定義
 * 
 * このファイルでは、ブロックチェーンシステムで使用する
 * すべてのインターフェースと型を定義する
 */

// ============================================
// トランザクション関連の型
// ============================================

/**
 * トランザクション（取引）のインターフェース
 * 送金者から受取者への価値の移転を表す
 */
export interface ITransaction {
  /** 送信者の公開鍵（アドレス） */
  sender: string;
  /** 受信者の公開鍵（アドレス） */
  recipient: string;
  /** 送金額 */
  amount: number;
  /** トランザクション作成時のタイムスタンプ */
  timestamp: number;
  /** デジタル署名（送信者の秘密鍵で署名） */
  signature?: string;
}

// ============================================
// ブロック関連の型
// ============================================

/**
 * ブロックのインターフェース
 * トランザクションをまとめて格納するデータ構造
 */
export interface IBlock {
  /** ブロックの連番（0から始まる） */
  index: number;
  /** ブロック作成時のタイムスタンプ */
  timestamp: number;
  /** このブロックに含まれるトランザクションの配列 */
  transactions: ITransaction[];
  /** 前のブロックのハッシュ値（チェーンの連結に使用） */
  previousHash: string;
  /** Proof of Workで見つけた値 */
  nonce: number;
  /** このブロックのハッシュ値 */
  hash: string;
}

// ============================================
// ブロックチェーン関連の型
// ============================================

/**
 * ブロックチェーンのインターフェース
 * ブロックの連鎖とトランザクション管理を行う
 */
export interface IBlockchain {
  /** ブロックの配列（チェーン本体） */
  chain: IBlock[];
  /** まだブロックに含まれていない保留中のトランザクション */
  pendingTransactions: ITransaction[];
  /** マイニングの難易度（ハッシュの先頭に必要なゼロの数） */
  difficulty: number;
  /** マイニング報酬（新しいブロックを採掘した人への報酬） */
  miningReward: number;
}

// ============================================
// ウォレット関連の型
// ============================================

/**
 * ウォレットのインターフェース
 * 公開鍵と秘密鍵のペアを管理する
 */
export interface IWallet {
  /** 公開鍵（アドレスとして使用） */
  publicKey: string;
  /** 秘密鍵（署名に使用、絶対に公開しない） */
  privateKey: string;
}

// ============================================
// マイナー関連の型
// ============================================

/**
 * マイナーのインターフェース
 * Proof of Workを実行してブロックを採掘する
 */
export interface IMiner {
  /** マイニングの難易度 */
  difficulty: number;
}

/**
 * マイニング結果の型
 * マイニングが完了した時に返される情報
 */
export interface MiningResult {
  /** 見つかったnonce値 */
  nonce: number;
  /** 条件を満たしたハッシュ値 */
  hash: string;
  /** 試行回数 */
  attempts: number;
  /** かかった時間（ミリ秒） */
  timeMs: number;
}

// ============================================
// ストレージ関連の型
// ============================================

/**
 * ストレージのインターフェース
 * ブロックチェーンとウォレットの永続化を行う
 */
export interface IStorage {
  /** ブロックチェーンをファイルに保存 */
  save(blockchain: IBlockchain): void;
  /** ブロックチェーンをファイルから読み込み */
  load(): IBlockchain | null;
  /** ウォレットを名前付きで保存 */
  saveWallet(wallet: IWallet, name: string): void;
  /** 名前を指定してウォレットを読み込み */
  loadWallet(name: string): IWallet | null;
  /** 保存されているウォレット名の一覧を取得 */
  listWallets(): string[];
}

// ============================================
// エラー関連の型
// ============================================

/**
 * カスタムエラークラスの基底
 */
export class CryptoPlaygroundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CryptoPlaygroundError';
  }
}

/** 無効なハッシュエラー */
export class InvalidHashError extends CryptoPlaygroundError {
  constructor(message: string = '無効なハッシュ形式です') {
    super(message);
    this.name = 'InvalidHashError';
  }
}

/** 無効なブロックエラー */
export class InvalidBlockError extends CryptoPlaygroundError {
  constructor(message: string = '無効なブロックです') {
    super(message);
    this.name = 'InvalidBlockError';
  }
}

/** 残高不足エラー */
export class InsufficientBalanceError extends CryptoPlaygroundError {
  constructor(message: string = '残高が不足しています') {
    super(message);
    this.name = 'InsufficientBalanceError';
  }
}

/** 無効な金額エラー */
export class InvalidAmountError extends CryptoPlaygroundError {
  constructor(message: string = '無効な金額です') {
    super(message);
    this.name = 'InvalidAmountError';
  }
}

/** 無効な鍵エラー */
export class InvalidKeyError extends CryptoPlaygroundError {
  constructor(message: string = '無効な鍵形式です') {
    super(message);
    this.name = 'InvalidKeyError';
  }
}

/** ウォレットインポートエラー */
export class WalletImportError extends CryptoPlaygroundError {
  constructor(message: string = 'ウォレットのインポートに失敗しました') {
    super(message);
    this.name = 'WalletImportError';
  }
}

/** ストレージ破損エラー */
export class StorageCorruptedError extends CryptoPlaygroundError {
  constructor(message: string = 'ストレージデータが破損しています') {
    super(message);
    this.name = 'StorageCorruptedError';
  }
}

/** ストレージ書き込みエラー */
export class StorageWriteError extends CryptoPlaygroundError {
  constructor(message: string = 'ストレージへの書き込みに失敗しました') {
    super(message);
    this.name = 'StorageWriteError';
  }
}
