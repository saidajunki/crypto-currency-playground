/**
 * ストレージ（Storage）モジュール
 * 
 * ブロックチェーンとウォレットをファイルに永続化する。
 * JSON形式でローカルファイルシステムに保存・読み込みを行う。
 */

import * as fs from 'fs';
import * as path from 'path';
import { IStorage, IBlockchain, IWallet, StorageCorruptedError, StorageWriteError } from './types/index.js';
import { Blockchain } from './blockchain.js';
import { Wallet } from './wallet.js';

/**
 * ファイルストレージクラス
 * 
 * ブロックチェーンの状態とウォレットをJSONファイルとして保存・読み込みする。
 * 
 * 【ディレクトリ構造】
 * dataDir/
 *   ├── blockchain.json    # ブロックチェーンの状態
 *   └── wallets/
 *       ├── alice.json     # ウォレット（名前付き）
 *       └── bob.json
 */
export class FileStorage implements IStorage {
  private dataDir: string;
  private blockchainFile: string;
  private walletsDir: string;

  /**
   * ファイルストレージを初期化する
   * 
   * @param dataDir - データを保存するディレクトリのパス
   */
  constructor(dataDir: string = './data') {
    this.dataDir = dataDir;
    this.blockchainFile = path.join(dataDir, 'blockchain.json');
    this.walletsDir = path.join(dataDir, 'wallets');

    // ディレクトリが存在しない場合は作成
    this.ensureDirectories();
  }

  /**
   * 必要なディレクトリを作成する
   */
  private ensureDirectories(): void {
    // データディレクトリ
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    // ウォレットディレクトリ
    if (!fs.existsSync(this.walletsDir)) {
      fs.mkdirSync(this.walletsDir, { recursive: true });
    }
  }

  /**
   * ブロックチェーンをファイルに保存する
   * 
   * @param blockchain - 保存するブロックチェーン
   * @throws StorageWriteError - 書き込みに失敗した場合
   */
  save(blockchain: IBlockchain): void {
    try {
      const json = JSON.stringify(blockchain, null, 2);
      fs.writeFileSync(this.blockchainFile, json, 'utf-8');
      console.log(`ブロックチェーンを保存しました: ${this.blockchainFile}`);
    } catch (error) {
      throw new StorageWriteError(`ブロックチェーンの保存に失敗しました: ${error}`);
    }
  }

  /**
   * ブロックチェーンをファイルから読み込む
   * 
   * @returns 読み込んだBlockchainインスタンス、ファイルが存在しない場合はnull
   * @throws StorageCorruptedError - データが破損している場合
   */
  load(): Blockchain | null {
    // ファイルが存在しない場合はnullを返す
    if (!fs.existsSync(this.blockchainFile)) {
      return null;
    }

    try {
      const json = fs.readFileSync(this.blockchainFile, 'utf-8');
      const data = JSON.parse(json);
      return Blockchain.fromJSON(data);
    } catch (error) {
      throw new StorageCorruptedError(`ブロックチェーンデータが破損しています: ${error}`);
    }
  }

  /**
   * ウォレットを名前付きで保存する
   * 
   * @param wallet - 保存するウォレット
   * @param name - ウォレットの名前（ファイル名として使用）
   * @throws StorageWriteError - 書き込みに失敗した場合
   */
  saveWallet(wallet: IWallet, name: string): void {
    try {
      const filePath = path.join(this.walletsDir, `${name}.json`);
      const json = JSON.stringify({
        publicKey: wallet.publicKey,
        privateKey: wallet.privateKey,
      }, null, 2);
      fs.writeFileSync(filePath, json, 'utf-8');
      console.log(`ウォレット "${name}" を保存しました`);
    } catch (error) {
      throw new StorageWriteError(`ウォレットの保存に失敗しました: ${error}`);
    }
  }

  /**
   * 名前を指定してウォレットを読み込む
   * 
   * @param name - ウォレットの名前
   * @returns 読み込んだWalletインスタンス、存在しない場合はnull
   * @throws StorageCorruptedError - データが破損している場合
   */
  loadWallet(name: string): Wallet | null {
    const filePath = path.join(this.walletsDir, `${name}.json`);

    // ファイルが存在しない場合はnullを返す
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const json = fs.readFileSync(filePath, 'utf-8');
      return Wallet.import(json);
    } catch (error) {
      throw new StorageCorruptedError(`ウォレットデータが破損しています: ${error}`);
    }
  }

  /**
   * 保存されているウォレット名の一覧を取得する
   * 
   * @returns ウォレット名の配列
   */
  listWallets(): string[] {
    // ウォレットディレクトリが存在しない場合は空配列
    if (!fs.existsSync(this.walletsDir)) {
      return [];
    }

    // .jsonファイルを検索し、拡張子を除いた名前を返す
    const files = fs.readdirSync(this.walletsDir);
    return files
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''));
  }

  /**
   * ウォレットを削除する
   * 
   * @param name - 削除するウォレットの名前
   * @returns 削除に成功した場合true
   */
  deleteWallet(name: string): boolean {
    const filePath = path.join(this.walletsDir, `${name}.json`);

    if (!fs.existsSync(filePath)) {
      return false;
    }

    try {
      fs.unlinkSync(filePath);
      console.log(`ウォレット "${name}" を削除しました`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 全データをクリアする（テスト用）
   */
  clear(): void {
    // ブロックチェーンファイルを削除
    if (fs.existsSync(this.blockchainFile)) {
      fs.unlinkSync(this.blockchainFile);
    }

    // ウォレットファイルを全て削除
    if (fs.existsSync(this.walletsDir)) {
      const files = fs.readdirSync(this.walletsDir);
      for (const file of files) {
        fs.unlinkSync(path.join(this.walletsDir, file));
      }
    }
  }
}
