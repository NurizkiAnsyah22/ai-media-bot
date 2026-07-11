"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TelegramService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const telegraf_1 = require("telegraf");
const crypto_1 = require("crypto");
const api_client_service_1 = require("../common/http/api-client.service");
let TelegramService = TelegramService_1 = class TelegramService {
    configService;
    apiClientService;
    logger = new common_1.Logger(TelegramService_1.name);
    bot;
    isReady = false;
    constructor(configService, apiClientService) {
        this.configService = configService;
        this.apiClientService = apiClientService;
    }
    async onModuleInit() {
        const token = this.configService.get('BOT_TOKEN');
        if (!token) {
            throw new Error('BOT_TOKEN tidak ditemukan di environment variables');
        }
        this.bot = new telegraf_1.Telegraf(token);
        this.bot.use(async (ctx, next) => {
            const correlationId = (0, crypto_1.randomUUID)();
            ctx.correlationId = correlationId;
            const startTime = Date.now();
            this.logger.log(`[${correlationId}] Incoming update — chatId: ${ctx.chat?.id}, type: ${ctx.updateType}`);
            await next();
            const durationMs = Date.now() - startTime;
            this.logger.log(`[${correlationId}] Selesai diproses — ${durationMs}ms`);
        });
        this.bot.start(async (ctx) => {
            const correlationId = ctx.correlationId;
            const from = ctx.from;
            try {
                await this.apiClientService.syncUser({
                    telegramId: String(from.id),
                    firstName: from.first_name,
                    lastName: from.last_name,
                    username: from.username,
                    languageCode: from.language_code,
                }, correlationId);
                this.logger.log(`[${correlationId}] User ${from.id} berhasil disinkronkan`);
                await ctx.reply(`Halo, ${from.first_name ?? 'Sobat'}! 👋\n\nSelamat datang di AI Media Bot. Pilih menu di bawah ini:`, {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '🎬 Generate Media', callback_data: 'generate_media' }],
                            [{ text: '💰 Cek Credit', callback_data: 'check_credit' }],
                            [{ text: '📜 Riwayat', callback_data: 'history' }],
                        ],
                    },
                });
            }
            catch (err) {
                this.logger.error(`[${correlationId}] Gagal sync user ${from.id}: ${err.message}`);
                await ctx.reply('Maaf, terjadi kendala saat memproses permintaan Anda. Silakan coba lagi dalam beberapa saat.');
            }
        });
        this.bot.action('generate_media', async (ctx) => {
            const correlationId = ctx.correlationId;
            this.logger.log(`[${correlationId}] Action 'generate_media' ditekan oleh ${ctx.from.id}`);
            await ctx.answerCbQuery('Fitur ini akan segera hadir 🚧');
        });
        this.bot.action('check_credit', async (ctx) => {
            const correlationId = ctx.correlationId;
            this.logger.log(`[${correlationId}] Action 'check_credit' ditekan oleh ${ctx.from.id}`);
            await ctx.answerCbQuery('Fitur ini akan segera hadir 🚧');
        });
        this.bot.action('history', async (ctx) => {
            const correlationId = ctx.correlationId;
            this.logger.log(`[${correlationId}] Action 'history' ditekan oleh ${ctx.from.id}`);
            await ctx.answerCbQuery('Fitur ini akan segera hadir 🚧');
        });
        this.bot.on('message', (ctx) => {
            const correlationId = ctx.correlationId;
            this.logger.log(`[${correlationId}] Update diterima dari chatId: ${ctx.chat.id}`);
        });
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
    getBotInstance() {
        return this.bot;
    }
    isBotReady() {
        return this.isReady;
    }
};
exports.TelegramService = TelegramService;
exports.TelegramService = TelegramService = TelegramService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        api_client_service_1.ApiClientService])
], TelegramService);
//# sourceMappingURL=telegram.service.js.map