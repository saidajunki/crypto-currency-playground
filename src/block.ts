/**
 * ブロック（Block）モジュール
 * 
 * ブロックチェーンの基本単位となるブロックを定義する。
 * 各ブロックはトランザクションの集合と、前のブロックへの参照を持つ。
 */

import CryptoJS from 'crypto-js';
import { IBlock, ITransaction, InvalidBlockError } from './types/index.js';

/**
 * ブロッククラス
 * 
 * ブロックチェーンを構成する個々のブロックを表す。
 * 各ブロックは以下の情報を持つ：
 * - index: チェーン内での位置（0から始まる）
 * - timestamp: 作成日時
 * - transactions: 含まれるトランザクションの配列
 * - previousHash: 前のブロックのハッシュ（チェーンの連結）
 * - nonce: Proof of Workで見つけた値
 * - hash: このブロック自身のハッシュ
 */
export class Block implements IBlock {
  public index: number;
  public timestamp: number;
  public transactions: ITransaction[];
  public previousHash: string;
  public nonce: number;
  public hash: string;

  /**
   * ブロックを作成する
   * 
   * @param index - ブロックの連番
   * @param timestamp - 作成時刻（ミリ秒）
   * @param transactions - このブロックに含めるトランザクション
   * @param previousHash - 前のブロックのハッシュ値
   * @param nonce - Proof of Workで見つけたnonce（デフォルト0）
   */
  constructor(
    index: number,
    timestamp: number,
    transactions: ITransaction[],
    previousHash: string,
    nonce: number = 0
  ) {
    this.index = index;
    this.timestamp = timestamp;
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.nonce = nonce;
    // ブロック作成時にハッシュを計算
    this.hash = this.calculateHash();
  }

  /**
   * ブロックのハッシュを計算する
   * 
   * ブロックの全フィールド（hash以外）を連結してSHA-256でハッシュ化する。
   * これにより、ブロックの内容が少しでも変わるとハッシュが完全に変わる。
   * 
   * @returns SHA-256ハッシュ値（16進数文字列）
   */
  calculateHash(): string {
    // トランザクションをJSON文字列に変換
    const transactionsString = JSON.stringify(this.transactions);
    
    // 全フィールドを連結してハッシュ化
    // 順序: index + previousHash + timestamp + transactions + nonce
    const data = 
      this.index.toString() +
      this.previousHash +
      this.timestamp.toString() +
      transactionsString +
      this.nonce.toString();
    
    return CryptoJS.SHA256(data).toString();
  }

  /**
   * ブロックをJSON形式に変換する
   * 
   * ファイル保存やネットワーク送信用にシリアライズする。
   * 
   * @returns JSONオブジェクト
   */
  toJSON(): object {
    return {
      index: this.index,
      timestamp: this.timestamp,
      transactions: this.transactions,
      previousHash: this.previousHash,
      nonce: this.nonce,
      hash: this.hash,
    };
  }

  /**
   * JSONからブロックを復元する
   * 
   * 保存されたデータやネットワークから受信したデータからブロックを再構築する。
   * 
   * @param json - ブロックのJSONデータ
   * @returns 復元されたBlockインスタンス
   * @throws InvalidBlockError - 必須フィールドが欠けている場合
   */
  static fromJSON(json: unknown): Block {
    // 型チェック
    if (typeof json !== 'object' || json === null) {
      throw new InvalidBlockError('JSONオブジェクトが必要です');
    }

    const data = json as Record<string, unknown>;

    // 必須フィールドの存在チェック
    if (
      typeof data.index !== 'number' ||
      typeof data.timestamp !== 'number' ||
      !Array.isArray(data.transactions) ||
      typeof data.previousHash !== 'string' ||
      typeof data.nonce !== 'number' ||
      typeof data.hash !== 'string'
    ) {
      throw new InvalidBlockError('ブロックの必須フィールドが不足しています');
    }

    // ブロックを再構築
    const block = new Block(
      data.index,
      data.timestamp,
      data.transactions as ITransaction[],
      data.previousHash,
      data.nonce
    );

    // 保存されていたハッシュと再計算したハッシュが一致するか確認
    // （データ整合性のチェック）
    if (block.hash !== data.hash) {
      throw new InvalidBlockError('ブロックのハッシュが一致しません（データが破損している可能性があります）');
    }

    return block;
  }

  /**
   * ジェネシスブロック（最初のブロック）を作成する
   * 
   * ブロックチェーンの起点となる特別なブロック。
   * previousHashは"0"で、トランザクションは空。
   * 
   * @returns ジェネシスブロック
   */
  static createGenesisBlock(): Block {
    return new Block(
      0,                    // index: 最初のブロックなので0
      Date.now(),           // timestamp: 現在時刻
      [],                   // transactions: 空の配列
      '0',                  // previousHash: 前のブロックがないので"0"
      0                     // nonce: 初期値0
    );
  }
}
