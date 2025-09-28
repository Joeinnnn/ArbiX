import dotenv from 'dotenv';
dotenv.config({ override: true });
import path from 'node:path';
import fs from 'node:fs';
import { Telegraf, Markup } from 'telegraf';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

const token = process.env.TELEGRAM_BOT_TOKEN;
const supportAdminChatId = process.env.SUPPORT_ADMIN_CHAT_ID ? Number(process.env.SUPPORT_ADMIN_CHAT_ID) : undefined;
if (!token) {
  console.error('Missing TELEGRAM_BOT_TOKEN in environment.');
  process.exit(1);
}

const bot = new Telegraf(token);

// In-memory wallet store per user (ephemeral; persist later)
type NamedWallet = { name: string; keypair: Keypair };
const userWallets = new Map<number, NamedWallet[]>();

// Inline keyboard shown under messages (3 columns for wider buttons)
const inlineMenu = Markup.inlineKeyboard([
  [
    Markup.button.callback('📈 Trade', 'trade'),
    Markup.button.callback('🎯 Sniper', 'sniper'),
    Markup.button.callback('📊 Portfolio', 'portfolio')
  ],
  [
    Markup.button.callback('🤖 Automations', 'automations'),
    Markup.button.callback('⏱ Limit Orders', 'limit_orders'),
    Markup.button.callback('⚙️ Settings', 'settings')
  ],
  [
    Markup.button.callback('👛 Wallet', 'wallet'),
    Markup.button.callback('💸 Withdraw', 'withdraw'),
    Markup.button.callback('🛟 Support', 'support')
  ],
  [
    Markup.button.callback('🔄 Refresh', 'refresh')
  ]
]);

// Ensure user has at least one wallet and return the list
function getUserWallets(userId: number) {
  let list = userWallets.get(userId);
  if (!list || list.length === 0) {
    list = [{ name: 'Main Wallet', keypair: Keypair.generate() }];
    userWallets.set(userId, list);
  }
  return list;
}

// Helper to send a card with optional "galaxy" background (ArbiX.jpg) and a keyboard
async function sendCard(ctx: any, caption: string, keyboard?: any) {
  const imagePath = path.resolve(process.cwd(), 'ArbiX.jpg');
  if (fs.existsSync(imagePath)) {
    await ctx.replyWithPhoto({ source: imagePath }, keyboard ? { caption, ...keyboard } : { caption });
  } else {
    if (keyboard) {
      await ctx.reply(caption, keyboard);
    } else {
      await ctx.reply(caption);
    }
  }
}

async function sendWelcome(ctx: any) {
  const firstName = ctx.from?.first_name ?? 'there';
  const list = getUserWallets(ctx.from.id);
  const pubkey = list[0].keypair.publicKey.toBase58();

  const caption = [
    `👋 Welcome ${firstName}!`,
    'ArbiX — Telegram memecoin trading, simplified.',
    '',
    'Your Solana Wallet Address:',
    `→ ${pubkey}`,
    '',
    'Resources:',
    '• Website: https://arbix.example',
    '• Docs: https://arbix.example/docs',
    '• Support: https://t.me/ArbiXSolanabot?start=support',
    '',
    'Use the menu below to get started.'
  ].join('\n');

  // send zero-width non-joiner to satisfy Telegram 'text must be non-empty'
  const rm = await ctx.reply('\u2060', Markup.removeKeyboard());
  setTimeout(() => {
    const chatId = (ctx.chat as any)?.id ?? (ctx.from as any)?.id;
    if (chatId) {
      ctx.telegram.deleteMessage(chatId, (rm as any).message_id).catch(() => {});
    }
  }, 200);
  await sendCard(ctx, caption, inlineMenu);
}

bot.start(async (ctx) => { await sendWelcome(ctx); });
bot.command('start', async (ctx) => { await sendWelcome(ctx); });

// --- Submenu keyboards ---
function tradeKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🪙 Paste Token', 'trade_paste')],
    [Markup.button.callback('📉 Set Slippage', 'trade_set_slip')],
    [Markup.button.callback('⬅️ Back', 'back_home')]
  ]);
}
function automationsKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📈 DCA', 'auto_dca'), Markup.button.callback('🎯 TP / SL', 'auto_tp_sl')],
    [Markup.button.callback('📉 Trailing Stop', 'auto_trailing')],
    [Markup.button.callback('⬅️ Back', 'back_home')]
  ]);
}
function limitOrdersKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🛒 Create Buy', 'limit_create_buy'), Markup.button.callback('💰 Create Sell', 'limit_create_sell')],
    [Markup.button.callback('🗂 View Orders', 'limit_view')],
    [Markup.button.callback('⬅️ Back', 'back_home')]
  ]);
}
function portfolioKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('💼 Balances', 'pf_balances'), Markup.button.callback('📊 PnL', 'pf_pnl')],
    [Markup.button.callback('🧾 Recent Tx', 'pf_recent')],
    [Markup.button.callback('⬅️ Back', 'back_home')]
  ]);
}
function settingsKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('⚡ Gas Presets', 'set_gas'), Markup.button.callback('📉 Slippage', 'set_slip')],
    [Markup.button.callback('👛 Wallet', 'wallet')],
    [Markup.button.callback('⬅️ Back', 'back_home')]
  ]);
}
function withdrawKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('➡️ To Main Wallet', 'wd_main'), Markup.button.callback('✉️ Custom Address', 'wd_custom')],
    [Markup.button.callback('⬅️ Back', 'back_home')]
  ]);
}

// --- Sniper state (in-memory, per user) ---
type SniperConfig = {
  tokenMint: string | null; // base58 token address to buy
  amountSol: number;        // amount in SOL to spend
  slippageBps: number;      // 1% = 100 bps
  autoBuy: boolean;         // whether to auto-execute when condition met
};
const defaultSniper: SniperConfig = { tokenMint: null, amountSol: 0.1, slippageBps: 150, autoBuy: false };
const userSniper = new Map<number, SniperConfig>();

function getSniper(userId: number): SniperConfig {
  const s = userSniper.get(userId) ?? { ...defaultSniper };
  userSniper.set(userId, s);
  return s;
}

function sniperKeyboard(s: SniperConfig) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(`🎯 Token ${s.tokenMint ? '✅' : '⚪'}`, 'sniper_set_token')],
    [Markup.button.callback(`💰 Amount: ${s.amountSol} SOL`, 'sniper_set_amount')],
    [Markup.button.callback(`📉 Slippage: ${(s.slippageBps/100).toFixed(2)}%`, 'sniper_set_slip')],
    [Markup.button.callback(`${s.autoBuy ? '🟢 Auto-Buy ON' : '⚪ Auto-Buy OFF'}`, 'sniper_toggle_auto')],
    [Markup.button.callback('🚀 Snipe Now', 'sniper_now')],
    [Markup.button.callback('⬅️ Back', 'sniper_back')]
  ]);
}

async function showSniper(ctx: any) {
  const s = getSniper(ctx.from!.id);
  const text = [
    '🎯 Sniper',
    '',
    `Token: ${s.tokenMint ?? '—'}`,
    `Amount: ${s.amountSol} SOL`,
    `Slippage: ${(s.slippageBps/100).toFixed(2)}%`,
    `Auto-Buy: ${s.autoBuy ? 'ON' : 'OFF'}`,
    '',
    'Tips:',
    '• Paste a token mint address to set token.',
    '• You can also tap buttons to adjust settings.',
  ].join('\n');
  await sendCard(ctx, text, sniperKeyboard(s));
}

// Menu handlers (submenus)
bot.action('trade', async (ctx) => { await ctx.answerCbQuery(); await sendCard(ctx, 'Trade', tradeKeyboard()); });
bot.action('sniper', async (ctx) => { await ctx.answerCbQuery(); await showSniper(ctx); });
bot.action('automations', async (ctx) => { await ctx.answerCbQuery(); await sendCard(ctx, 'Automations', automationsKeyboard()); });
bot.action('portfolio', async (ctx) => { await ctx.answerCbQuery(); await sendCard(ctx, 'Portfolio', portfolioKeyboard()); });
bot.action('wallet', async (ctx) => {
  await ctx.answerCbQuery();
  const list = userWallets.get(ctx.from!.id) ?? [];
  if (list.length === 0) {
    list.push({ name: 'Main Wallet', keypair: Keypair.generate() });
    userWallets.set(ctx.from!.id, list);
  }
  const lines = list.map((w, i) => `→ ${w.name} - ${w.keypair.publicKey.toBase58()}`);
  const text = ['🧾 Wallets', '', ...lines, '', '💡 Select an action below.'].join('\n');
  const actions = Markup.inlineKeyboard([
    [Markup.button.callback('💼 Create New', 'wallet_create'), Markup.button.callback('📤 Export', 'wallet_export')],
    [Markup.button.callback('📝 Rename', 'wallet_rename'), Markup.button.callback('🗑 Delete', 'wallet_delete')],
    [Markup.button.callback('⬅️ Close', 'wallet_close')]
  ]);
  await sendCard(ctx, text, actions);
});

bot.action('wallet_create', async (ctx) => {
  await ctx.answerCbQuery();
  const list = userWallets.get(ctx.from!.id) ?? [];
  const newWallet = { name: 'Main Wallet', keypair: Keypair.generate() };
  // If there is already a Main Wallet, name sequentially
  const base = 'Main Wallet';
  const count = list.filter(w => w.name.startsWith(base)).length;
  newWallet.name = count === 0 ? base : `${base} ${count+1}`;
  list.push(newWallet);
  userWallets.set(ctx.from!.id, list);
  await sendCard(ctx, `Created ${newWallet.name}:\n→ ${newWallet.keypair.publicKey.toBase58()}`, inlineMenu);
});

bot.action('wallet_export', async (ctx) => {
  await ctx.answerCbQuery();
  const list = userWallets.get(ctx.from!.id) ?? [];
  if (list.length === 0) return ctx.reply('No wallet to export.', inlineMenu);
  const w = list[0];
  const secret = bs58.encode(w.keypair.secretKey);
  const msg = await ctx.reply(`⚠️ Private key (keep secret):\n${secret}`);
  setTimeout(() => {
    const chatId = (ctx.chat as any)?.id ?? (ctx.from as any)?.id;
    if (chatId) {
      ctx.telegram.deleteMessage(chatId, (msg as any).message_id).catch(() => {});
    }
  }, 10 * 60 * 1000);
});

bot.action('wallet_rename', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('Send the new name for your main wallet (or type /cancel).');
  (ctx as any).state = (ctx as any).state || {};
  (ctx as any).state.expectingRename = true;
});

bot.hears(/.*/, async (ctx, next) => {
  const s = (ctx as any).state;
  if (s?.expectingRename) {
    const list = userWallets.get(ctx.from!.id) ?? [];
    if (list.length) {
      list[0].name = ctx.message?.text?.trim() || list[0].name;
      userWallets.set(ctx.from!.id, list);
      await sendCard(ctx, `Wallet renamed to: ${list[0].name}`, inlineMenu);
    }
    s.expectingRename = false;
    return;
  }
  if (s?.openTicket) {
    const text = (ctx.message as any)?.text?.trim();
    if (text?.toLowerCase?.() === '/cancel') {
      s.openTicket = false;
      await ctx.reply('Ticket creation cancelled.');
      return;
    }
    if (text && supportAdminChatId) {
      const user = ctx.from!;
      const header = `📨 Support Ticket from @${user.username ?? user.id}\nUser ID: ${user.id}`;
      await ctx.telegram.sendMessage(supportAdminChatId, [header, '', text].join('\n'));
      await ctx.reply('Thanks! Your message has been sent to support. We will get back to you.');
    } else if (text) {
      await ctx.reply('Support is currently unavailable. Please DM the support bot.');
    }
    s.openTicket = false;
    return;
  }
  // Sniper: set token/amount/slippage from free-text prompts
  const text = (ctx.message as any)?.text?.trim();
  if (typeof text === 'string' && text.length > 0) {
    if (s?.expectingAmount) {
      const v = Number(text);
      if (!Number.isFinite(v) || v <= 0) {
        await ctx.reply('Please send a valid positive number for amount in SOL.');
      } else {
        const sc = getSniper(ctx.from!.id);
        sc.amountSol = Number(v.toFixed(6));
        userSniper.set(ctx.from!.id, sc);
        await ctx.reply('Amount updated.');
        await showSniper(ctx);
      }
      s.expectingAmount = false;
      return;
    }
    if (s?.expectingSlip) {
      const v = Number(text);
      if (!Number.isFinite(v) || v <= 0 || v > 50) {
        await ctx.reply('Please send a slippage between 0 and 50 (percent).');
      } else {
        const sc = getSniper(ctx.from!.id);
        sc.slippageBps = Math.round(v * 100); // convert % → bps
        userSniper.set(ctx.from!.id, sc);
        await ctx.reply('Slippage updated.');
        await showSniper(ctx);
      }
      s.expectingSlip = false;
      return;
    }
    // naive base58-ish check for token mint
    if (text.length >= 32 && text.length <= 60 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(text)) {
      const sc = getSniper(ctx.from!.id);
      sc.tokenMint = text;
      userSniper.set(ctx.from!.id, sc);
      await ctx.reply('Token set for sniper.');
      await showSniper(ctx);
      return;
    }
  }
  // Allow command handlers like /menu to run
  if ((ctx.message as any)?.text?.startsWith?.('/')) return next();
  return next();
});

bot.action('wallet_delete', async (ctx) => {
  await ctx.answerCbQuery();
  const list = userWallets.get(ctx.from!.id) ?? [];
  if (list.length) {
    const removed = list.shift()!;
    userWallets.set(ctx.from!.id, list);
    await ctx.reply(`Deleted wallet: ${removed.name}`);
  } else {
    await ctx.reply('No wallet to delete.');
  }
});

bot.action('wallet_close', async (ctx) => {
  await ctx.answerCbQuery();
  try { await ctx.deleteMessage(); } catch {}
  await sendWelcome(ctx);
});
bot.action('limit_orders', async (ctx) => { await ctx.answerCbQuery(); await sendCard(ctx, 'Limit Orders', limitOrdersKeyboard()); });
bot.action('settings', async (ctx) => { await ctx.answerCbQuery(); await sendCard(ctx, 'Settings', settingsKeyboard()); });
bot.action('support', async (ctx) => {
  await ctx.answerCbQuery();
  const kb = Markup.inlineKeyboard([
    [Markup.button.url('💬 DM Support', 'https://t.me/ArbiXSolanabot')],
    [Markup.button.callback('📝 Open Ticket', 'support_ticket')],
    [Markup.button.callback('❓ FAQ', 'support_faq')],
    [Markup.button.callback('⬅️ Back', 'support_back')]
  ]);
  await sendCard(ctx, 'Support Center', kb);
});
bot.action('withdraw', async (ctx) => { await ctx.answerCbQuery(); await sendCard(ctx, 'Withdraw: move funds to your main wallet.', inlineMenu); });
bot.action('back_home', async (ctx) => { await ctx.answerCbQuery(); await sendWelcome(ctx); });
bot.action('refresh', async (ctx) => { await ctx.answerCbQuery('Refreshed'); await sendWelcome(ctx); });

// --- Sniper action handlers ---
bot.action('sniper_set_token', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('Paste the SPL token mint address to snipe.');
});
bot.action('sniper_set_amount', async (ctx) => {
  await ctx.answerCbQuery();
  (ctx as any).state = (ctx as any).state || {};
  (ctx as any).state.expectingAmount = true;
  await ctx.reply('Send the amount in SOL (e.g., 0.1).');
});
bot.action('sniper_set_slip', async (ctx) => {
  await ctx.answerCbQuery();
  (ctx as any).state = (ctx as any).state || {};
  (ctx as any).state.expectingSlip = true;
  await ctx.reply('Send slippage in percent (e.g., 1.5).');
});
bot.action('sniper_toggle_auto', async (ctx) => {
  await ctx.answerCbQuery();
  const s = getSniper(ctx.from!.id);
  s.autoBuy = !s.autoBuy;
  userSniper.set(ctx.from!.id, s);
  await showSniper(ctx);
});
bot.action('sniper_now', async (ctx) => {
  await ctx.answerCbQuery();
  const s = getSniper(ctx.from!.id);
  if (!s.tokenMint) {
    await ctx.reply('Set a token mint first.');
    return;
  }
  await ctx.reply('Preparing snipe (quote → swap) ...');
  // Placeholder: actual on-chain swap will be implemented next
  await ctx.reply('Snipe simulated. On-chain execution coming soon.');
  await showSniper(ctx);
});
bot.action('sniper_back', async (ctx) => {
  await ctx.answerCbQuery();
  await sendWelcome(ctx);
});

// --- Support flows ---
bot.action('support_back', async (ctx) => { await ctx.answerCbQuery(); await sendWelcome(ctx); });
bot.action('support_faq', async (ctx) => {
  await ctx.answerCbQuery();
  const faq = [
    '❓ FAQ',
    '',
    'Q: Is ArbiX self-custodial?',
    'A: Yes, your keys stay in your device/session. Export any time.',
    '',
    'Q: What networks are supported?',
    'A: Solana for now.',
    '',
    'Q: How do I report a bug?',
    'A: Open a ticket in Support or DM the support bot.'
  ].join('\n');
  await sendCard(ctx, faq, Markup.inlineKeyboard([[Markup.button.callback('⬅️ Back', 'support')]]));
});
bot.action('support_ticket', async (ctx) => {
  await ctx.answerCbQuery();
  (ctx as any).state = (ctx as any).state || {};
  (ctx as any).state.openTicket = true;
  await ctx.reply('Describe your issue. We will forward it to support. (/cancel to abort)');
});

bot.catch((err, ctx) => {
  console.error('Bot error', err);
});

// Expose a commands-based Menu so Telegram shows the blue "Menu" button
bot.telegram
  .setMyCommands([
    { command: 'start', description: 'Show welcome and main menu' },
    { command: 'menu', description: 'Show main menu' },
    { command: 'trade', description: 'Start trading flow' },
    { command: 'sniper', description: 'Configure sniping' },
    { command: 'portfolio', description: 'View balances and PnL' },
    { command: 'wallet', description: 'Show your wallet address' },
    { command: 'settings', description: 'Configure bot and wallet' },
    { command: 'help', description: 'Get help and support' }
  ])
  .catch(console.error);

// Ensure the blue Menu button shows the commands list
bot.telegram
  .setChatMenuButton({ menuButton: { type: 'commands' } } as any)
  .catch(console.error);

// Command aliases for menu items
bot.command('menu', async (ctx) => { await sendWelcome(ctx); });

// Optional command to hide any reply keyboard explicitly
bot.command('hide', async (ctx) => {
  await ctx.reply('Keyboard hidden.', Markup.removeKeyboard());
});
bot.command('trade', async (ctx) => sendCard(ctx, 'Trade', tradeKeyboard()));
bot.command('sniper', async (ctx) => showSniper(ctx));
bot.command('portfolio', async (ctx) => sendCard(ctx, 'Portfolio', portfolioKeyboard()));
bot.command('wallet', async (ctx) => {
  const list = getUserWallets(ctx.from!.id);
  const lines = list.map((w) => `→ ${w.name} - ${w.keypair.publicKey.toBase58()}`);
  const text = ['🧾 Wallets', '', ...lines, '', '💡 Select an action below.'].join('\n');
  const actions = Markup.inlineKeyboard([
    [Markup.button.callback('💼 Create New', 'wallet_create'), Markup.button.callback('📤 Export', 'wallet_export')],
    [Markup.button.callback('📝 Rename', 'wallet_rename'), Markup.button.callback('🗑 Delete', 'wallet_delete')],
    [Markup.button.callback('⬅️ Close', 'wallet_close')]
  ]);
  await sendCard(ctx, text, actions);
});
bot.command('settings', async (ctx) => sendCard(ctx, 'Settings', settingsKeyboard()));
bot.command('help', async (ctx) => ctx.reply('Support: DM @your_support or open a ticket.', inlineMenu));

bot.launch().then(() => {
  console.log('ArbiX bot started.');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
// Ensure long polling is used (clear any old webhooks)
bot.telegram.deleteWebhook({ drop_pending_updates: false }).catch(() => {});

