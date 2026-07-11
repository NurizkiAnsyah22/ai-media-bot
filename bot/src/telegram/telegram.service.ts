import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import { randomUUID } from 'crypto';
import { ApiClientService } from '../common/http/api-client.service';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Telegraf;
  private isReady = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly apiClientService: ApiClientService,
  ) {}

  async onModuleInit() {
    const token = this.configService.get<string>('BOT_TOKEN');

    if (!token) {
      throw new Error('BOT_TOKEN tidak ditemukan di environment variables');
    }

    this.bot = new Telegraf(token);

    this.bot.use(async (ctx, next) => {
      const correlationId = randomUUID();
      (ctx as any).correlationId = correlationId;
      const startTime = Date.now();

      this.logger.log(
        `[${correlationId}] Incoming update — chatId: ${ctx.chat?.id}, type: ${ctx.updateType}`,
      );

      await next();

      const durationMs = Date.now() - startTime;
      this.logger.log(`[${correlationId}] Selesai diproses — ${durationMs}ms`);
    });

    // --- Task 1.5 + 1.6: /start handler dengan main menu ---
    this.bot.start(async (ctx) => {
      const correlationId = (ctx as any).correlationId;
      const from = ctx.from;

      try {
        await this.apiClientService.syncUser(
          {
            telegramId: String(from.id),
            firstName: from.first_name,
            lastName: from.last_name,
            username: from.username,
            languageCode: from.language_code,
          },
          correlationId,
        );

        this.logger.log(`[${correlationId}] User ${from.id} berhasil disinkronkan`);

        await ctx.reply(
          `Halo, ${from.first_name ?? 'Sobat'}! 👋\n\nSelamat datang di AI Media Bot. Pilih menu di bawah ini:`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🎬 Generate Media', callback_data: 'generate_media' }],
                [{ text: '💰 Cek Credit', callback_data: 'check_credit' }],
                [{ text: '📜 Riwayat', callback_data: 'history' }],
              ],
            },
          },
        );
      } catch (err) {
        this.logger.error(
          `[${correlationId}] Gagal sync user ${from.id}: ${(err as Error).message}`,
        );
        try {
          await ctx.reply(
            'Maaf, terjadi kendala saat memproses permintaan Anda. Silakan coba lagi dalam beberapa saat.',
          );
        } catch (replyErr) {
          this.logger.error(
            `[${correlationId}] Gagal mengirim pesan error ke user ${from.id}: ${(replyErr as Error).message}`,
          );
        }
      }
    });

    // --- Task 1.6: Main Menu Skeleton ---
    this.bot.action('generate_media', async (ctx) => {
      const correlationId = (ctx as any).correlationId;
      this.logger.log(`[${correlationId}] Action 'generate_media' ditekan oleh ${ctx.from.id}`);
      await ctx.answerCbQuery('Fitur ini akan segera hadir 🚧');
    });

    // --- Task 2.2: Cek Credit Wiring ---
    this.bot.action('check_credit', async (ctx) => {
      const correlationId = (ctx as any).correlationId;
      const from = ctx.from;

      this.logger.log(`[${correlationId}] Action 'check_credit' ditekan oleh ${from.id}`);
      await ctx.answerCbQuery();

      try {
        const user = await this.apiClientService.syncUser(
          {
            telegramId: String(from.id),
            firstName: from.first_name,
            lastName: from.last_name,
            username: from.username,
            languageCode: from.language_code,
          },
          correlationId,
        );

        const { creditBalance } = await this.apiClientService.getCreditBalance(
          user.id,
          correlationId,
        );

        await ctx.reply(`💰 Saldo credit Anda saat ini: *${creditBalance}*`, {
          parse_mode: 'Markdown',
        });
      } catch (err) {
        this.logger.error(
          `[${correlationId}] Gagal cek credit untuk user ${from.id}: ${(err as Error).message}`,
        );
        try {
          await ctx.reply('Maaf, terjadi kendala saat mengambil data saldo. Silakan coba lagi.');
        } catch (replyErr) {
          this.logger.error(
            `[${correlationId}] Gagal mengirim pesan error ke user ${from.id}: ${(replyErr as Error).message}`,
          );
        }
      }
    });

    this.bot.action('history', async (ctx) => {
      const correlationId = (ctx as any).correlationId;
      this.logger.log(`[${correlationId}] Action 'history' ditekan oleh ${ctx.from.id}`);
      await ctx.answerCbQuery('Fitur ini akan segera hadir 🚧');
    });

    // Handler generic — HANYA SATU, di posisi paling akhir
    this.bot.on('message', (ctx) => {
      const correlationId = (ctx as any).correlationId;
      this.logger.log(`[${correlationId}] Update diterima dari chatId: ${ctx.chat.id}`);
    });

    // Telegraf's launch() adalah long-running promise yang TIDAK resolve
    // selama bot berjalan — gunakan callback untuk deteksi "polling pertama kali berhasil".
    this.bot.launch(() => {
      this.isReady = true;
      this.logger.log('Telegram bot berhasil connect (long polling aktif)');
    });

    setTimeout(() => {
      if (!this.isReady) {
        this.logger.warn('bot.launch() belum ready setelah 15 detik, masih mencoba di background...');
      }
    }, 15000);
  }

  onModuleDestroy() {
    this.isReady = false;
    this.bot.stop('SIGTERM');
    this.logger.log('Telegram bot berhenti dengan bersih');
  }

  getBotInstance(): Telegraf {
    return this.bot;
  }

  isBotReady(): boolean {
    return this.isReady;
  }
}