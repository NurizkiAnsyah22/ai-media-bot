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
let TelegramService = TelegramService_1 = class TelegramService {
    configService;
    logger = new common_1.Logger(TelegramService_1.name);
    bot;
    constructor(configService) {
        this.configService = configService;
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
        this.bot.on('message', (ctx) => {
            const correlationId = ctx.correlationId;
            this.logger.log(`[${correlationId}] Update diterima dari chatId: ${ctx.chat.id}`);
        });
        await this.bot.launch();
        this.logger.log('Telegram bot berhasil connect (long polling aktif)');
    }
    onModuleDestroy() {
        this.bot.stop('SIGTERM');
        this.logger.log('Telegram bot berhenti dengan bersih');
    }
    getBotInstance() {
        return this.bot;
    }
};
exports.TelegramService = TelegramService;
exports.TelegramService = TelegramService = TelegramService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], TelegramService);
//# sourceMappingURL=telegram.service.js.map