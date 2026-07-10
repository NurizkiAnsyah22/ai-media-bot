import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ApiClientService } from './api-client.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        baseURL: config.get<string>('API_BASE_URL'),
        timeout: config.get<number>('HTTP_TIMEOUT_MS'),
        headers: {
          'x-internal-api-key': config.get<string>('INTERNAL_API_KEY'),
        },
      }),
    }),
  ],
  providers: [ApiClientService],
  exports: [ApiClientService],
})
export class ApiClientModule {}