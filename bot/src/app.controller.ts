import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { TelegramService } from './telegram/telegram.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly telegramService: TelegramService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // --- Task 1.7: Health & Readiness ---
  @Get('health/live')
  live() {
    return { status: 'ok' };
  }

  @Get('health/ready')
  ready() {
    // Sengaja TIDAK cek koneksi ke backend API —
    // readiness bot murni soal apakah bot.launch() sudah sukses,
    // supaya bot tetap "ready" walau backend sedang down.
    const isReady = this.telegramService.isBotReady();
    return {
      status: isReady ? 'ok' : 'not_ready',
      telegram: isReady ? 'connected' : 'connecting',
    };
  }
}