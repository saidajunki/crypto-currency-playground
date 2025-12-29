/**
 * ウォレット（Wallet）モジュール
 * 
 * 公開鍵と秘密鍵のペアを管理するウォレット。
 * 暗号通貨の「財布」として機能し、トランザクションの署名と検証を行う。
 */

import { ec as EC } from 'elliptic';
import { IWallet, InvalidKeyError, WalletImportError } from './types/index.js';

// 楕円曲線暗号のインスタンス（Bitcoinと同じsecp256k1を使用）
const ec = new EC('secp256k1');

/**
 * ウォレットクラス
 * 
 * 公開鍵暗号を使った鍵ペアの管理を行う。
 * - 公開鍵: アドレスとして公開し、送金先として使用
 * - 秘密鍵: 絶対に公開せず、トランザクションの署名に使用
 */
export class Wallet implements IWallet {
  public publicKey: string;
  public privateKey: string;

  /**
   * ウォレットを作成する（内部用）
   * 
   * 外部からは generate() または fromPrivateKey() を使用すること。
   * 
   * @param publicKey - 公開鍵（16進数文字列）
   * @param privateKey - 秘密鍵（16進数文字列）
   */
  private constructor(publicKey: string, privateKey: string) {
    this.publicKey = publicKey;
    this.privateKey = privateKey;
  }

  /**
   * 新しいウォレットを生成する
   * 
   * ランダムな鍵ペアを生成して新しいウォレットを作成する。
   * 秘密鍵は安全に保管すること！
   * 
   * @returns 新しいWalletインスタンス
   */
  static generate(): Wallet {
    // ランダムな鍵ペアを生成
    const keyPair = ec.genKeyPair();
    
    // 公開鍵と秘密鍵を16進数文字列として取得
    const publicKey = keyPair.getPublic('hex');
    const privateKey = keyPair.getPrivate('hex');
    
    return new Wallet(publicKey, privateKey);
  }

  /**
   * 秘密鍵からウォレットを復元する
   * 
   * 既存の秘密鍵から公開鍵を導出してウォレットを再構築する。
   * 
   * @param privateKey - 秘密鍵（16進数文字列）
   * @returns 復元されたWalletインスタンス
   * @throws InvalidKeyError - 秘密鍵の形式が無効な場合
   */
  static fromPrivateKey(privateKey: string): Wallet {
    try {
      // 秘密鍵からキーペアを復元
      const keyPair = ec.keyFromPrivate(privateKey, 'hex');
      
      // 公開鍵を導出
      const publicKey = keyPair.getPublic('hex');
      
      return new Wallet(publicKey, privateKey);
    } catch {
      throw new InvalidKeyError('無効な秘密鍵形式です');
    }
  }

  /**
   * データに署名する
   * 
   * 秘密鍵を使ってデータに署名する。
   * 署名は、このウォレットの所有者がデータを承認したことを証明する。
   * 
   * @param data - 署名対象のデータ（文字列）
   * @returns 署名（DER形式の16進数文字列）
   */
  sign(data: string): string {
    // 秘密鍵からキーペアを復元
    const keyPair = ec.keyFromPrivate(this.privateKey, 'hex');
    
    // データに署名
    const signature = keyPair.sign(data, 'base64');
    
    // DER形式の16進数文字列として返す
    return signature.toDER('hex');
  }

  /**
   * 署名を検証する（静的メソッド）
   * 
   * 公開鍵を使って署名が有効かどうかを検証する。
   * 署名が有効であれば、対応する秘密鍵の所有者がデータを承認したことが証明される。
   * 
   * @param publicKey - 検証に使う公開鍵（16進数文字列）
   * @param data - 署名されたデータ（文字列）
   * @param signature - 検証する署名（DER形式の16進数文字列）
   * @returns 署名が有効な場合true、無効な場合false
   */
  static verify(publicKey: string, data: string, signature: string): boolean {
    try {
      // 公開鍵からキーペアを作成
      const keyPair = ec.keyFromPublic(publicKey, 'hex');
      
      // 署名を検証
      return keyPair.verify(data, signature);
    } catch {
      // 検証中にエラーが発生した場合は無効
      return false;
    }
  }

  /**
   * ウォレットのアドレスを取得する
   * 
   * アドレスは公開鍵そのもの（簡略化のため）。
   * 実際のBitcoinではハッシュ化やBase58エンコードが行われる。
   * 
   * @returns アドレス（公開鍵）
   */
  getAddress(): string {
    return this.publicKey;
  }

  /**
   * ウォレットをエクスポートする
   * 
   * ウォレットの鍵ペアをJSON文字列として出力する。
   * ファイルに保存したり、バックアップを取る際に使用。
   * 
   * ⚠️ 秘密鍵が含まれるため、安全に保管すること！
   * 
   * @returns JSON文字列
   */
  export(): string {
    return JSON.stringify({
      publicKey: this.publicKey,
      privateKey: this.privateKey,
    });
  }

  /**
   * エクスポートされたデータからウォレットをインポートする
   * 
   * export()で出力したJSON文字列からウォレットを復元する。
   * 
   * @param data - エクスポートされたJSON文字列
   * @returns 復元されたWalletインスタンス
   * @throws WalletImportError - データの形式が無効な場合
   */
  static import(data: string): Wallet {
    try {
      const parsed = JSON.parse(data);
      
      // 必須フィールドのチェック
      if (
        typeof parsed.publicKey !== 'string' ||
        typeof parsed.privateKey !== 'string'
      ) {
        throw new WalletImportError('ウォレットデータの形式が無効です');
      }

      // 秘密鍵から公開鍵を再導出して整合性を確認
      const wallet = Wallet.fromPrivateKey(parsed.privateKey);
      
      // 保存されていた公開鍵と一致するか確認
      if (wallet.publicKey !== parsed.publicKey) {
        throw new WalletImportError('公開鍵と秘密鍵が一致しません');
      }

      return wallet;
    } catch (error) {
      if (error instanceof WalletImportError) {
        throw error;
      }
      throw new WalletImportError('ウォレットのインポートに失敗しました');
    }
  }
}
