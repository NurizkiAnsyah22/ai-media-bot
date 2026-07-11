import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { CreditService } from './credit.service';
import { CreditHistoryQueryDto } from './dto/credit-history-query.dto';
import { AdminCreditAdjustDto } from './dto/admin-credit-adjust.dto';
import { InternalAuthGuard } from '../../common/guards/internal-auth.guard';
import type {
  CreditBalanceResponse,
  CreditHistoryResponse,
  CreditMutationResult,
} from '@ai-media-bot/contracts';

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

// --- Task 2.3: Manual Credit Adjustment (Testing Aid) ---
// Controller terpisah dengan path admin, dilindungi InternalAuthGuard sementara.
// Akan dimigrasikan ke AdminAuthGuard penuh di Phase 9.
@Controller('admin/user/:id/credits')
@UseGuards(InternalAuthGuard)
export class AdminCreditController {
  constructor(private readonly creditService: CreditService) {}

  @Post('adjust')
  async adjust(
    @Param('id') userId: string,
    @Body() dto: AdminCreditAdjustDto,
  ): Promise<CreditMutationResult> {
    return this.creditService.topup({
      userId,
      amount: dto.amount,
      reason: dto.reason,
      referenceType: 'MANUAL',
      note: dto.note,
    });
  }
}