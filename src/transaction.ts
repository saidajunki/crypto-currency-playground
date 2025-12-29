/**
 * トランザクション（Transaction）モジュール
 * 
 * 暗号通貨における送金取引を表すデータ構造。
 * 各トランザクションはデジタル署名によって認証される。
 */

import CryptoJS from 'crypto-js';
import elliptic from 'elliptic';
import { ITransaction, InvalidAmountError } from './types/index.js';

// 楕円曲線暗号のインスタンス（Bitcoinと同じsecp256k1を使用）
const EC = elliptic.ec;
const ec = new EC('secp256k1');

/**
 * トランザクションクラス
 * 
 * 送金者から受取者への価値の移転を表す。
 * 各トランザクションは以下の情報を持つ：
 * - sender: 送金者のアドレス（公開鍵）
 * - recipient: 受取者のアドレス（公開鍵）
 * - amount: 送金額
 * - timestamp: 作成日時
 * - signature: デジタル署名（送金者の秘密鍵で署名）
 */
export class Transaction implements ITransaction {
  public sender: string;
  public recipient: string;
  public amount: number;
  public timestamp: number;
  public signature?: string;

  /**
   * トランザクションを作成する
   * 
   * @param sender - 送金者のアドレス（公開鍵）
   * @param recipient - 受取者のアドレス（公開鍵）
   * @param amount - 送金額（正の数）
   * @throws InvalidAmountError - 金額が0以下の場合
   */
  constructor(sender: string, recipient: string, amount: number) {
    // 金額のバリデーション
    if (amount <= 0) {
      throw new InvalidAmountError('送金額は正の数である必要があります');
    }

    this.sender = sender;
    this.recipient = recipient;
    this.amount = amount;
    this.timestamp = Date.now();
  }

  /**
   * トランザクションのハッシュを計算する
   * 
   * 署名対象となるデータのハッシュを生成する。
   * sender, recipient, amount, timestampを連結してSHA-256でハッシュ化。
   * 
   * @returns SHA-256ハッシュ値（16進数文字列）
   */
  calculateHash(): string {
    const data = 
      this.sender +
      this.recipient +
      this.amount.toString() +
      this.timestamp.toString();
    
    return CryptoJS.SHA256(data).toString();
  }

  /**
   * トランザクションに署名する
   * 
   * 送金者の秘密鍵を使ってトランザクションに署名する。
   * これにより、送金者本人がこのトランザクションを承認したことを証明できる。
   * 
   * @param privateKey - 送金者の秘密鍵（16進数文字列）
   */
  sign(privateKey: string): void {
    // 秘密鍵からキーペアを復元
    const keyPair = ec.keyFromPrivate(privateKey, 'hex');
    
    // 公開鍵を取得して送金者アドレスと一致するか確認
    const publicKey = keyPair.getPublic('hex');
    if (publicKey !== this.sender) {
      throw new Error('秘密鍵が送金者のアドレスと一致しません');
    }

    // トランザクションのハッシュに署名
    const hash = this.calculateHash();
    const signature = keyPair.sign(hash, 'base64');
    
    // 署名をDER形式の16進数文字列として保存
    this.signature = signature.toDER('hex');
  }

  /**
   * トランザクションの署名を検証する
   * 
   * 署名が有効かどうかを確認する。
   * - マイニング報酬トランザクション（sender が空）は常に有効
   * - 署名がない場合は無効
   * - 署名が送金者の公開鍵で検証できれば有効
   * 
   * @returns 署名が有効な場合true、無効な場合false
   */
  isValid(): boolean {
    // マイニング報酬トランザクションは署名不要
    // （システムが発行するため、送金者がいない）
    if (this.sender === '' || this.sender === 'MINING_REWARD') {
      return true;
    }

    // 署名がない場合は無効
    if (!this.signature) {
      return false;
    }

    try {
      // 送金者の公開鍵でキーペアを作成
      const keyPair = ec.keyFromPublic(this.sender, 'hex');
      
      // 署名を検証
      const hash = this.calculateHash();
      return keyPair.verify(hash, this.signature);
    } catch {
      // 検証中にエラーが発生した場合は無効
      return false;
    }
  }

  /**
   * トランザクションをJSON形式に変換する
   * 
   * @returns JSONオブジェクト
   */
  toJSON(): object {
    return {
      sender: this.sender,
      recipient: this.recipient,
      amount: this.amount,
      timestamp: this.timestamp,
      signature: this.signature,
    };
  }

  /**
   * JSONからトランザクションを復元する
   * 
   * @param json - トランザクションのJSONデータ
   * @returns 復元されたTransactionインスタンス
   */
  static fromJSON(json: unknown): Transaction {
    if (typeof json !== 'object' || json === null) {
      throw new Error('JSONオブジェクトが必要です');
    }

    const data = json as Record<string, unknown>;

    // 必須フィールドのチェック
    if (
      typeof data.sender !== 'string' ||
      typeof data.recipient !== 'string' ||
      typeof data.amount !== 'number' ||
      typeof data.timestamp !== 'number'
    ) {
      throw new Error('トランザクションの必須フィールドが不足しています');
    }

    // トランザクションを再構築
    const tx = new Transaction(data.sender, data.recipient, data.amount);
    tx.timestamp = data.timestamp;
    
    // 署名があれば復元
    if (typeof data.signature === 'string') {
      tx.signature = data.signature;
    }

    return tx;
  }

  /**
   * マイニング報酬トランザクションを作成する
   * 
   * 新しいブロックを採掘したマイナーへの報酬として発行される特別なトランザクション。
   * 送金者は空（システムが発行）で、署名は不要。
   * 
   * @param minerAddress - マイナーのアドレス（報酬の受取先）
   * @param reward - 報酬額
   * @returns マイニング報酬トランザクション
   */
  static createMiningReward(minerAddress: string, reward: number): Transaction {
    const tx = new Transaction('MINING_REWARD', minerAddress, reward);
    return tx;
  }
}
