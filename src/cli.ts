/**
 * CLI（コマンドラインインターフェース）モジュール
 * 
 * インタラクティブに暗号通貨の仕組みを試せるREPL環境を提供する。
 * ウォレット作成、送金、マイニング、残高確認などの操作が可能。
 */

import * as readline from 'readline';
import { Blockchain } from './blockchain.js';
import { Transaction } from './transaction.js';
import { Wallet } from './wallet.js';
import { FileStorage } from './storage.js';

/**
 * CLIクラス
 * 
 * コマンドラインからブロックチェーンを操作するためのインターフェース。
 */
class CLI {
  private blockchain: Blockchain;
  private storage: FileStorage;
  private rl: readline.Interface;

  constructor() {
    this.storage = new FileStorage('./data');
    
    // 保存されたブロックチェーンを読み込む、なければ新規作成
    const savedBlockchain = this.storage.load();
    if (savedBlockchain) {
      this.blockchain = savedBlockchain;
      console.log('保存されたブロックチェーンを読み込みました');
    } else {
      this.blockchain = new Blockchain(2, 100);
      console.log('新しいブロックチェーンを作成しました');
    }

    // readline インターフェースを作成
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  /**
   * ヘルプメッセージを表示する
   */
  private showHelp(): void {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║           暗号通貨 Playground - コマンド一覧                    ║
╠════════════════════════════════════════════════════════════════╣
║ ウォレット操作:                                                 ║
║   wallet create <name>    新しいウォレットを作成                ║
║   wallet list             ウォレット一覧を表示                  ║
║   wallet balance <name>   ウォレットの残高を確認                ║
║   wallet info <name>      ウォレットの詳細情報を表示            ║
║                                                                ║
║ トランザクション:                                               ║
║   send <from> <to> <amt>  送金を実行                            ║
║   pending                 保留中のトランザクションを表示        ║
║                                                                ║
║ マイニング:                                                     ║
║   mine <wallet>           マイニングを実行（報酬を受け取る）    ║
║                                                                ║
║ ブロックチェーン:                                               ║
║   chain                   ブロックチェーン全体を表示            ║
║   validate                チェーンの整合性を検証                ║
║   block <index>           特定のブロックを表示                  ║
║                                                                ║
║ その他:                                                         ║
║   help                    このヘルプを表示                      ║
║   save                    現在の状態を保存                      ║
║   exit                    終了                                  ║
╚════════════════════════════════════════════════════════════════╝
`);
  }

  /**
   * ウォレットを作成する
   */
  private createWallet(name: string): void {
    if (!name) {
      console.log('エラー: ウォレット名を指定してください');
      console.log('使い方: wallet create <name>');
      return;
    }

    // 既存のウォレットがないか確認
    const existing = this.storage.loadWallet(name);
    if (existing) {
      console.log(`エラー: ウォレット "${name}" は既に存在します`);
      return;
    }

    // 新しいウォレットを生成して保存
    const wallet = Wallet.generate();
    this.storage.saveWallet(wallet, name);

    console.log(`\nウォレット "${name}" を作成しました！`);
    console.log(`アドレス: ${wallet.getAddress().substring(0, 32)}...`);
    console.log('\n⚠️  秘密鍵は安全に保管してください！');
  }

  /**
   * ウォレット一覧を表示する
   */
  private listWallets(): void {
    const wallets = this.storage.listWallets();

    if (wallets.length === 0) {
      console.log('ウォレットがありません。"wallet create <name>" で作成してください。');
      return;
    }

    console.log('\n=== ウォレット一覧 ===');
    for (const name of wallets) {
      const wallet = this.storage.loadWallet(name);
      if (wallet) {
        const balance = this.blockchain.getBalanceOfAddress(wallet.getAddress());
        console.log(`  ${name}: 残高 ${balance}`);
      }
    }
    console.log('');
  }

  /**
   * ウォレットの残高を表示する
   */
  private showBalance(name: string): void {
    if (!name) {
      console.log('エラー: ウォレット名を指定してください');
      console.log('使い方: wallet balance <name>');
      return;
    }

    const wallet = this.storage.loadWallet(name);
    if (!wallet) {
      console.log(`エラー: ウォレット "${name}" が見つかりません`);
      return;
    }

    const balance = this.blockchain.getBalanceOfAddress(wallet.getAddress());
    console.log(`\nウォレット "${name}" の残高: ${balance}`);
  }

  /**
   * ウォレットの詳細情報を表示する
   */
  private showWalletInfo(name: string): void {
    if (!name) {
      console.log('エラー: ウォレット名を指定してください');
      return;
    }

    const wallet = this.storage.loadWallet(name);
    if (!wallet) {
      console.log(`エラー: ウォレット "${name}" が見つかりません`);
      return;
    }

    const balance = this.blockchain.getBalanceOfAddress(wallet.getAddress());
    const history = this.blockchain.getTransactionHistory(wallet.getAddress());

    console.log(`\n=== ウォレット "${name}" ===`);
    console.log(`アドレス: ${wallet.getAddress()}`);
    console.log(`残高: ${balance}`);
    console.log(`\nトランザクション履歴 (${history.length}件):`);
    
    for (const tx of history) {
      const direction = tx.sender === wallet.getAddress() ? '送金' : '受取';
      const other = tx.sender === wallet.getAddress() 
        ? tx.recipient.substring(0, 16) + '...'
        : tx.sender.substring(0, 16) + '...';
      console.log(`  ${direction}: ${tx.amount} (${other})`);
    }
  }

  /**
   * 送金を実行する
   */
  private send(fromName: string, toName: string, amountStr: string): void {
    if (!fromName || !toName || !amountStr) {
      console.log('エラー: 引数が不足しています');
      console.log('使い方: send <from> <to> <amount>');
      return;
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      console.log('エラー: 金額は正の数で指定してください');
      return;
    }

    // 送金元ウォレットを読み込み
    const fromWallet = this.storage.loadWallet(fromName);
    if (!fromWallet) {
      console.log(`エラー: 送金元ウォレット "${fromName}" が見つかりません`);
      return;
    }

    // 送金先ウォレットを読み込み
    const toWallet = this.storage.loadWallet(toName);
    if (!toWallet) {
      console.log(`エラー: 送金先ウォレット "${toName}" が見つかりません`);
      return;
    }

    try {
      // トランザクションを作成
      const tx = new Transaction(
        fromWallet.getAddress(),
        toWallet.getAddress(),
        amount
      );

      // 署名
      tx.sign(fromWallet.privateKey);

      // ブロックチェーンに追加
      this.blockchain.addTransaction(tx);

      console.log(`\n送金トランザクションを作成しました！`);
      console.log(`  ${fromName} → ${toName}: ${amount}`);
      console.log('マイニングを実行するとトランザクションが確定します。');
    } catch (error) {
      console.log(`エラー: ${error}`);
    }
  }

  /**
   * 保留中のトランザクションを表示する
   */
  private showPending(): void {
    const pending = this.blockchain.pendingTransactions;

    if (pending.length === 0) {
      console.log('保留中のトランザクションはありません。');
      return;
    }

    console.log(`\n=== 保留中のトランザクション (${pending.length}件) ===`);
    for (const tx of pending) {
      const sender = tx.sender === 'MINING_REWARD' 
        ? 'MINING_REWARD' 
        : tx.sender.substring(0, 16) + '...';
      const recipient = tx.recipient.substring(0, 16) + '...';
      console.log(`  ${sender} → ${recipient}: ${tx.amount}`);
    }
  }

  /**
   * マイニングを実行する
   */
  private mine(walletName: string): void {
    if (!walletName) {
      console.log('エラー: 報酬を受け取るウォレット名を指定してください');
      console.log('使い方: mine <wallet>');
      return;
    }

    const wallet = this.storage.loadWallet(walletName);
    if (!wallet) {
      console.log(`エラー: ウォレット "${walletName}" が見つかりません`);
      return;
    }

    console.log('\nマイニングを開始します...');
    const startTime = Date.now();

    // マイニング実行
    this.blockchain.minePendingTransactions(wallet.getAddress());

    const elapsed = Date.now() - startTime;
    console.log(`\nマイニング完了！ (${elapsed}ms)`);
    console.log(`報酬 ${this.blockchain.miningReward} が "${walletName}" に付与されました。`);

    // 自動保存
    this.storage.save(this.blockchain);
  }

  /**
   * ブロックチェーン全体を表示する
   */
  private showChain(): void {
    console.log(`\n=== ブロックチェーン (${this.blockchain.chain.length}ブロック) ===`);
    console.log(`難易度: ${this.blockchain.difficulty}`);
    console.log(`マイニング報酬: ${this.blockchain.miningReward}\n`);

    for (const block of this.blockchain.chain) {
      console.log(`ブロック #${block.index}`);
      console.log(`  ハッシュ: ${block.hash.substring(0, 32)}...`);
      console.log(`  前ブロック: ${block.previousHash.substring(0, 32)}...`);
      console.log(`  タイムスタンプ: ${new Date(block.timestamp).toLocaleString()}`);
      console.log(`  トランザクション数: ${block.transactions.length}`);
      console.log(`  Nonce: ${block.nonce}`);
      console.log('');
    }
  }

  /**
   * 特定のブロックを表示する
   */
  private showBlock(indexStr: string): void {
    const index = parseInt(indexStr);
    if (isNaN(index) || index < 0 || index >= this.blockchain.chain.length) {
      console.log(`エラー: 有効なブロックインデックスを指定してください (0-${this.blockchain.chain.length - 1})`);
      return;
    }

    const block = this.blockchain.chain[index];
    console.log(`\n=== ブロック #${block.index} ===`);
    console.log(`ハッシュ: ${block.hash}`);
    console.log(`前ブロック: ${block.previousHash}`);
    console.log(`タイムスタンプ: ${new Date(block.timestamp).toLocaleString()}`);
    console.log(`Nonce: ${block.nonce}`);
    console.log(`\nトランザクション (${block.transactions.length}件):`);

    for (const tx of block.transactions) {
      const sender = tx.sender === 'MINING_REWARD' 
        ? 'MINING_REWARD' 
        : tx.sender.substring(0, 16) + '...';
      const recipient = tx.recipient.substring(0, 16) + '...';
      console.log(`  ${sender} → ${recipient}: ${tx.amount}`);
    }
  }

  /**
   * チェーンの整合性を検証する
   */
  private validate(): void {
    console.log('\nブロックチェーンを検証中...');
    const isValid = this.blockchain.isChainValid();

    if (isValid) {
      console.log('✓ ブロックチェーンは有効です！');
    } else {
      console.log('✗ ブロックチェーンに問題があります！');
    }
  }

  /**
   * 現在の状態を保存する
   */
  private save(): void {
    this.storage.save(this.blockchain);
    console.log('ブロックチェーンを保存しました。');
  }

  /**
   * コマンドを実行する
   */
  private executeCommand(input: string): boolean {
    const parts = input.trim().split(/\s+/);
    const command = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    switch (command) {
      case 'help':
        this.showHelp();
        break;

      case 'wallet':
        switch (args[0]) {
          case 'create':
            this.createWallet(args[1]);
            break;
          case 'list':
            this.listWallets();
            break;
          case 'balance':
            this.showBalance(args[1]);
            break;
          case 'info':
            this.showWalletInfo(args[1]);
            break;
          default:
            console.log('使い方: wallet <create|list|balance|info> [name]');
        }
        break;

      case 'send':
        this.send(args[0], args[1], args[2]);
        break;

      case 'pending':
        this.showPending();
        break;

      case 'mine':
        this.mine(args[0]);
        break;

      case 'chain':
        this.showChain();
        break;

      case 'block':
        this.showBlock(args[0]);
        break;

      case 'validate':
        this.validate();
        break;

      case 'save':
        this.save();
        break;

      case 'exit':
      case 'quit':
        this.save();
        console.log('さようなら！');
        return false;

      case '':
        // 空行は無視
        break;

      default:
        console.log(`不明なコマンド: ${command}`);
        console.log('"help" でコマンド一覧を表示できます。');
    }

    return true;
  }

  /**
   * CLIを開始する
   */
  start(): void {
    console.log('\n🪙 暗号通貨 Playground へようこそ！');
    console.log('"help" でコマンド一覧を表示できます。\n');

    const prompt = (): void => {
      this.rl.question('crypto> ', (input) => {
        const shouldContinue = this.executeCommand(input);
        if (shouldContinue) {
          prompt();
        } else {
          this.rl.close();
        }
      });
    };

    prompt();
  }
}

// CLIを起動
const cli = new CLI();
cli.start();
