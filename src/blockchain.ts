/**
 * ブロックチェーン（Blockchain）モジュール
 * 
 * ブロックの連鎖を管理し、トランザクションの検証、残高計算、
 * マイニングの調整などを行う中核コンポーネント。
 */

import { IBlockchain, ITransaction, InsufficientBalanceError } from './types/index.js';
import { Block } from './block.js';
import { Transaction } from './transaction.js';
import { Miner } from './miner.js';

/**
 * ブロックチェーンクラス
 * 
 * 暗号通貨システムの中核となるデータ構造。
 * - ブロックの連鎖（チェーン）を管理
 * - トランザクションの検証と保留
 * - マイニングによるブロック生成
 * - 残高計算とトランザクション履歴
 */
export class Blockchain implements IBlockchain {
  public chain: Block[];
  public pendingTransactions: ITransaction[];
  public difficulty: number;
  public miningReward: number;

  /**
   * ブロックチェーンを初期化する
   * 
   * @param difficulty - マイニングの難易度（デフォルト: 2）
   * @param miningReward - マイニング報酬（デフォルト: 100）
   */
  constructor(difficulty: number = 2, miningReward: number = 100) {
    this.difficulty = difficulty;
    this.miningReward = miningReward;
    this.pendingTransactions = [];
    
    // ジェネシスブロック（最初のブロック）を作成してチェーンを開始
    this.chain = [this.createGenesisBlock()];
  }

  /**
   * ジェネシスブロックを作成する
   * 
   * ブロックチェーンの起点となる最初のブロック。
   * previousHashは"0"で、トランザクションは空。
   * 
   * @returns ジェネシスブロック
   */
  createGenesisBlock(): Block {
    const genesisBlock = new Block(0, Date.now(), [], '0');
    
    // ジェネシスブロックもマイニングする（難易度条件を満たすハッシュを見つける）
    const miner = new Miner(this.difficulty);
    miner.mine(genesisBlock);
    
    return genesisBlock;
  }

  /**
   * チェーンの最後のブロックを取得する
   * 
   * 新しいブロックを追加する際に、このブロックのハッシュを参照する。
   * 
   * @returns 最後のブロック
   */
  getLatestBlock(): Block {
    return this.chain[this.chain.length - 1];
  }

  /**
   * トランザクションを保留リストに追加する
   * 
   * トランザクションの検証を行い、有効であれば保留リストに追加する。
   * 保留中のトランザクションは、次のマイニングでブロックに含まれる。
   * 
   * @param transaction - 追加するトランザクション
   * @returns 追加に成功した場合true
   * @throws InsufficientBalanceError - 残高不足の場合
   */
  addTransaction(transaction: Transaction): boolean {
    // マイニング報酬以外は署名の検証が必要
    if (transaction.sender !== 'MINING_REWARD') {
      // 署名の検証
      if (!transaction.isValid()) {
        console.log('無効な署名のトランザクションは拒否されました');
        return false;
      }

      // 残高チェック
      const senderBalance = this.getBalanceOfAddress(transaction.sender);
      if (senderBalance < transaction.amount) {
        throw new InsufficientBalanceError(
          `残高不足: 残高 ${senderBalance}, 送金額 ${transaction.amount}`
        );
      }
    }

    // 保留リストに追加
    this.pendingTransactions.push(transaction);
    return true;
  }

  /**
   * 保留中のトランザクションをマイニングしてブロックを生成する
   * 
   * 【処理の流れ】
   * 1. マイニング報酬トランザクションを作成
   * 2. 保留中のトランザクションを含む新しいブロックを作成
   * 3. Proof of Workを実行してブロックを採掘
   * 4. ブロックをチェーンに追加
   * 5. 保留リストをクリア
   * 
   * @param minerAddress - マイナーのアドレス（報酬の受取先）
   * @returns 採掘されたブロック
   */
  minePendingTransactions(minerAddress: string): Block {
    // マイニング報酬トランザクションを作成
    const rewardTx = Transaction.createMiningReward(minerAddress, this.miningReward);
    
    // 報酬トランザクションを保留リストに追加
    this.pendingTransactions.push(rewardTx);

    // 新しいブロックを作成
    const block = new Block(
      this.chain.length,                    // index: チェーンの長さ = 次のインデックス
      Date.now(),                           // timestamp: 現在時刻
      [...this.pendingTransactions],        // transactions: 保留中のトランザクションをコピー
      this.getLatestBlock().hash            // previousHash: 最後のブロックのハッシュ
    );

    // Proof of Workを実行
    const miner = new Miner(this.difficulty);
    const result = miner.mine(block);

    console.log(`ブロック #${block.index} を採掘しました！`);
    console.log(`  ハッシュ: ${result.hash}`);
    console.log(`  試行回数: ${result.attempts}`);
    console.log(`  所要時間: ${result.timeMs}ms`);

    // ブロックをチェーンに追加
    this.chain.push(block);

    // 保留リストをクリア
    this.pendingTransactions = [];

    return block;
  }

  /**
   * ブロックチェーンの整合性を検証する
   * 
   * 【検証項目】
   * 1. 各ブロックのハッシュが正しく計算されているか
   * 2. 各ブロックのpreviousHashが前のブロックのハッシュと一致するか
   * 3. 各ブロックのハッシュが難易度条件を満たしているか
   * 
   * @returns チェーンが有効な場合true
   */
  isChainValid(): boolean {
    const target = '0'.repeat(this.difficulty);

    // ジェネシスブロック以降の各ブロックを検証
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      // 1. 現在のブロックのハッシュが正しいか確認
      if (currentBlock.hash !== currentBlock.calculateHash()) {
        console.log(`ブロック #${i} のハッシュが不正です`);
        return false;
      }

      // 2. previousHashが前のブロックのハッシュと一致するか確認
      if (currentBlock.previousHash !== previousBlock.hash) {
        console.log(`ブロック #${i} のpreviousHashが不正です`);
        return false;
      }

      // 3. ハッシュが難易度条件を満たしているか確認
      if (!currentBlock.hash.startsWith(target)) {
        console.log(`ブロック #${i} のハッシュが難易度条件を満たしていません`);
        return false;
      }
    }

    return true;
  }

  /**
   * 指定アドレスの残高を計算する
   * 
   * チェーン内の全トランザクションを走査し、
   * 受け取った金額の合計 - 送った金額の合計 を計算する。
   * 
   * @param address - 残高を確認するアドレス
   * @returns 残高
   */
  getBalanceOfAddress(address: string): number {
    let balance = 0;

    // 全ブロックの全トランザクションを走査
    for (const block of this.chain) {
      for (const tx of block.transactions) {
        // 送金者の場合は残高を減らす
        if (tx.sender === address) {
          balance -= tx.amount;
        }
        // 受取者の場合は残高を増やす
        if (tx.recipient === address) {
          balance += tx.amount;
        }
      }
    }

    return balance;
  }

  /**
   * 指定アドレスのトランザクション履歴を取得する
   * 
   * @param address - 履歴を取得するアドレス
   * @returns トランザクションの配列
   */
  getTransactionHistory(address: string): ITransaction[] {
    const history: ITransaction[] = [];

    // 全ブロックの全トランザクションを走査
    for (const block of this.chain) {
      for (const tx of block.transactions) {
        // 送金者または受取者がアドレスと一致するトランザクションを収集
        if (tx.sender === address || tx.recipient === address) {
          history.push(tx);
        }
      }
    }

    return history;
  }

  /**
   * ブロックチェーンをJSON形式に変換する
   * 
   * @returns JSONオブジェクト
   */
  toJSON(): object {
    return {
      chain: this.chain.map(block => block.toJSON()),
      pendingTransactions: this.pendingTransactions,
      difficulty: this.difficulty,
      miningReward: this.miningReward,
    };
  }

  /**
   * JSONからブロックチェーンを復元する
   * 
   * @param json - ブロックチェーンのJSONデータ
   * @returns 復元されたBlockchainインスタンス
   */
  static fromJSON(json: unknown): Blockchain {
    if (typeof json !== 'object' || json === null) {
      throw new Error('JSONオブジェクトが必要です');
    }

    const data = json as Record<string, unknown>;

    // 必須フィールドのチェック
    if (
      !Array.isArray(data.chain) ||
      !Array.isArray(data.pendingTransactions) ||
      typeof data.difficulty !== 'number' ||
      typeof data.miningReward !== 'number'
    ) {
      throw new Error('ブロックチェーンの必須フィールドが不足しています');
    }

    // 新しいBlockchainインスタンスを作成（ジェネシスブロックは後で上書き）
    const blockchain = new Blockchain(data.difficulty, data.miningReward);

    // チェーンを復元
    blockchain.chain = data.chain.map((blockData: unknown) => Block.fromJSON(blockData));

    // 保留中のトランザクションを復元
    blockchain.pendingTransactions = data.pendingTransactions as ITransaction[];

    return blockchain;
  }
}
