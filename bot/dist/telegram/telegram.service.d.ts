import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import { ApiClientService } from '../common/http/api-client.service';
export declare class TelegramService implements OnModuleInit, OnModuleDestroy {
    private readonly configService;
    private readonly apiClientService;
    private readonly logger;
    private bot;
    constructor(configService: ConfigService, apiClientService: ApiClientService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): void;
    getBotInstance(): Telegraf;
}
