import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
export declare class TelegramService implements OnModuleInit, OnModuleDestroy {
    private readonly configService;
    private readonly logger;
    private bot;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): void;
    getBotInstance(): Telegraf;
}
