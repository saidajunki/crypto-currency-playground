/**
 * マイナー（Miner）モジュール
 * 
 * Proof of Work（作業証明）を実行してブロックを採掘する。
 * 難易度条件を満たすハッシュを見つけるまでnonceを変えながら計算を繰り返す。
 */

import { IMiner, MiningResult } from './types/index.js';
import { Block } from './block.js';

/**
 * マイナークラス
 * 
 * Proof of Workアルゴリズムを実装する。
 * 
 * 【Proof of Workとは】
 * ブロックのハッシュが特定の条件（先頭にN個のゼロ）を満たすまで、
 * nonceの値を変えながらハッシュを計算し続ける作業。
 * この作業には計算リソースが必要なため、不正なブロックの作成を困難にする。
 */
export class Miner implements IMiner {
  public difficulty: number;

  /**
   * マイナーを作成する
   * 
   * @param difficulty - マイニングの難易度（ハッシュの先頭に必要なゼロの数）
   *                     値が大きいほど難しくなる（2がデフォルト推奨）
   */
  constructor(difficulty: number = 2) {
    this.difficulty = difficulty;
  }

  /**
   * ブロックを採掘する（Proof of Work実行）
   * 
   * 難易度条件を満たすハッシュが見つかるまで、nonceを増やしながら
   * ハッシュを計算し続ける。
   * 
   * 【処理の流れ】
   * 1. nonce = 0 から開始
   * 2. ブロックのハッシュを計算
   * 3. ハッシュが条件（先頭N個がゼロ）を満たすかチェック
   * 4. 満たさなければ nonce++ して2に戻る
   * 5. 条件を満たしたら終了
   * 
   * @param block - 採掘するブロック
   * @returns マイニング結果（nonce, hash, 試行回数, 所要時間）
   */
  mine(block: Block): MiningResult {
    // 難易度に応じた目標パターン（例: difficulty=2 なら "00"）
    const target = '0'.repeat(this.difficulty);
    
    // 開始時刻を記録
    const startTime = Date.now();
    
    // 試行回数カウンター
    let attempts = 0;
    
    // 条件を満たすまでループ
    while (true) {
      attempts++;
      
      // 現在のnonceでハッシュを計算
      const hash = block.calculateHash();
      
      // ハッシュの先頭が目標パターンと一致するかチェック
      if (hash.startsWith(target)) {
        // 条件を満たした！
        const endTime = Date.now();
        
        // ブロックのハッシュを更新
        block.hash = hash;
        
        return {
          nonce: block.nonce,
          hash: hash,
          attempts: attempts,
          timeMs: endTime - startTime,
        };
      }
      
      // 条件を満たさなかったのでnonceを増やして再試行
      block.nonce++;
    }
  }

  /**
   * 難易度を変更する
   * 
   * @param newDifficulty - 新しい難易度
   */
  setDifficulty(newDifficulty: number): void {
    this.difficulty = newDifficulty;
  }

  /**
   * ハッシュが難易度条件を満たすかチェックする
   * 
   * @param hash - チェックするハッシュ値
   * @returns 条件を満たす場合true
   */
  isValidHash(hash: string): boolean {
    const target = '0'.repeat(this.difficulty);
    return hash.startsWith(target);
  }
}
