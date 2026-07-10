import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import { randomUUID } from 'crypto';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Telegraf;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const token = this.configService.get<string>('BOT_TOKEN');

    if (!token) {
      throw new Error('BOT_TOKEN tidak ditemukan di environment variables');
    }

    this.bot = new Telegraf(token);

    // Middleware correlation ID — jalan untuk SEMUA jenis update, sebelum handler apa pun
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

    this.bot.on('message', (ctx) => {
      const correlationId = (ctx as any).correlationId;
      this.logger.log(`[${correlationId}] Update diterima dari chatId: ${ctx.chat.id}`);
    });

    await this.bot.launch();
    this.logger.log('Telegram bot berhasil connect (long polling aktif)');
  }

  onModuleDestroy() {
    this.bot.stop('SIGTERM');
    this.logger.log('Telegram bot berhenti dengan bersih');
  }

  getBotInstance(): Telegraf {
    return this.bot;
  }
}