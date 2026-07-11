import { Controller, Get, Param, Query } from '@nestjs/common';
import { CreditService } from './credit.service';
import { CreditHistoryQueryDto } from './dto/credit-history-query.dto';
import type { CreditBalanceResponse, CreditHistoryResponse } from '@ai-media-bot/contracts';

@Controller('user/:id/credits')
export class CreditController {
  constructor(private readonly creditService: CreditService) {}

  @Get()
  async getBalance(@Param('id') userId: string): Promise<CreditBalanceResponse> {
    const creditBalance = await this.creditService.getBalance(userId);
    return { userId, creditBalance };
  }

  @Get('history')
  async getHistory(
    @Param('id') userId: string,
    @Query() query: CreditHistoryQueryDto,
  ): Promise<CreditHistoryResponse> {
    return this.creditService.getHistory(userId, query.page, query.pageSize);
  }
}