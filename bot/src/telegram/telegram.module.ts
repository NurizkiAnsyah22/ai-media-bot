import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { ApiClientModule } from '../common/http/api-client.module';

@Module({
  imports: [ApiClientModule],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}