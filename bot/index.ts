import dotenv from 'dotenv';
dotenv.config({ override: true });
import path from 'node:path';
import fs from 'node:fs';
import { Telegraf, Markup } from 'telegraf';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

const token = process.env.TELEGRAM_BOT_TOKEN;
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

// Menu handlers (stubs) for inline keyboard
bot.action('trade', async (ctx) => { await ctx.answerCbQuery(); await ctx.reply('Trade: paste a token address to begin.', inlineMenu); });
bot.action('sniper', async (ctx) => { await ctx.answerCbQuery(); await ctx.reply('Sniper: configure alerts and auto-buys.', inlineMenu); });
bot.action('automations', async (ctx) => { await ctx.answerCbQuery(); await ctx.reply('Automations: DCA, TP/SL, trailing stops.', inlineMenu); });
bot.action('portfolio', async (ctx) => { await ctx.answerCbQuery(); await ctx.reply('Portfolio: balances and PnL coming soon.', inlineMenu); });
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
bot.action('limit_orders', async (ctx) => { await ctx.answerCbQuery(); await sendCard(ctx, 'Limit Orders: schedule price-triggered trades.', inlineMenu); });
bot.action('settings', async (ctx) => { await ctx.answerCbQuery(); await sendCard(ctx, 'Settings: gas presets, slippage, wallet.', inlineMenu); });
bot.action('support', async (ctx) => { await ctx.answerCbQuery(); await sendCard(ctx, 'Support: DM @your_support or open a ticket.', inlineMenu); });
bot.action('withdraw', async (ctx) => { await ctx.answerCbQuery(); await sendCard(ctx, 'Withdraw: move funds to your main wallet.', inlineMenu); });
bot.action('refresh', async (ctx) => { await ctx.answerCbQuery('Refreshed'); await sendWelcome(ctx); });

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
bot.command('trade', async (ctx) => sendCard(ctx, 'Trade: paste a token address to begin.', inlineMenu));
bot.command('sniper', async (ctx) => sendCard(ctx, 'Sniper: configure alerts and auto-buys.', inlineMenu));
bot.command('portfolio', async (ctx) => sendCard(ctx, 'Portfolio: balances and PnL coming soon.', inlineMenu));
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
bot.command('settings', async (ctx) => ctx.reply('Settings: gas presets, slippage, wallet.', inlineMenu));
bot.command('help', async (ctx) => ctx.reply('Support: DM @your_support or open a ticket.', inlineMenu));

bot.launch().then(() => {
  console.log('ArbiX bot started.');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
// Ensure long polling is used (clear any old webhooks)
bot.telegram.deleteWebhook({ drop_pending_updates: false }).catch(() => {});


