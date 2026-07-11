import { Module } from '@nestjs/common';
import { CreditService } from './credit.service';
import { CreditController, AdminCreditController } from './credit.controller';

@Module({
  controllers: [CreditController, AdminCreditController],
  providers: [CreditService],
  exports: [CreditService],
})
export class CreditModule {}