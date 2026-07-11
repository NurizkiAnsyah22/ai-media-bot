import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InsufficientCreditException } from './exceptions/insufficient-credit.exception';
import type {
  CreditMutationResult,
  LedgerReasonType,
  ReferenceTypeValue,
} from '@ai-media-bot/contracts';

interface DeductParams {
  userId: string;
  amount: number;
  reason: LedgerReasonType;
  referenceType: ReferenceTypeValue;
  referenceId?: string;
  note?: string;
}

interface TopupParams {
  userId: string;
  amount: number;
  reason: LedgerReasonType;
  referenceType: ReferenceTypeValue;
  referenceId?: string;
  note?: string;
}

/**
 * CreditService — mengelola seluruh mutasi credit user.
 *
 * INVARIANT (wajib selalu benar setelah transaksi commit):
 *   users.creditBalance === SUM(seluruh CreditLedger.amount milik user,
 *   dengan tanda + untuk CREDIT dan - untuk DEBIT)
 *
 * Jika invariant ini pernah dilanggar, itu adalah bug kritikal pada
 * transaction boundary (deduct/refund/topup) — bukan hal yang bisa diabaikan.
 * Setiap perubahan pada method di service ini WAJIB mempertahankan invariant ini.
 */
@Injectable()
export class CreditService {
  private readonly logger = new Logger(CreditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getBalance(userId: string): Promise<number> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { creditBalance: true },
    });
    return user.creditBalance;
  }

  async getHistory(
  userId: string,
  page: number = 1,
  pageSize: number = 20,
): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
  const skip = (page - 1) * pageSize;

  const [items, total] = await this.prisma.$transaction([
    this.prisma.creditLedger.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    this.prisma.creditLedger.count({ where: { userId } }),
  ]);

  return {
    items: items.map((item) => ({
      id: item.id,
      amount: item.amount,
      balanceBefore: item.balanceBefore,
      balanceAfter: item.balanceAfter,
      type: item.type,
      reason: item.reason,
      note: item.note,
      referenceType: item.referenceType,
      referenceId: item.referenceId,
      createdAt: item.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  };
}

  async deduct(params: DeductParams): Promise<CreditMutationResult> {
    const { userId, amount, reason, referenceType, referenceId, note } = params;

    if (amount <= 0) {
      throw new Error('Jumlah deduct harus lebih besar dari 0');
    }

    return this.prisma.$transaction(async (tx) => {
      // Row lock — cegah race condition saat concurrent deduct pada user yang sama
      const locked = await tx.$queryRaw<{ credit_balance: number }[]>`
        SELECT credit_balance FROM users WHERE id = ${userId} FOR UPDATE
      `;

      if (locked.length === 0) {
        throw new Error(`User ${userId} tidak ditemukan`);
      }

      const balanceBefore = locked[0].credit_balance;
      const balanceAfter = balanceBefore - amount;

      if (balanceAfter < 0) {
        throw new InsufficientCreditException(userId, amount, balanceBefore);
      }

      await tx.user.update({
        where: { id: userId },
        data: { creditBalance: balanceAfter },
      });

      const ledger = await tx.creditLedger.create({
        data: {
          userId,
          amount,
          balanceBefore,
          balanceAfter,
          type: 'DEBIT',
          reason,
          referenceType,
          referenceId,
          note,
        },
      });

      this.logger.log(
        `Deduct ${amount} credit dari user ${userId} (${balanceBefore} → ${balanceAfter}), reason=${reason}`,
      );

      return {
        ledgerId: ledger.id,
        userId,
        amount,
        balanceBefore,
        balanceAfter,
      };
    });
  }

  async refund(params: Omit<DeductParams, 'reason'> & { reason?: LedgerReasonType }): Promise<CreditMutationResult> {
    return this.creditMutation({
      ...params,
      reason: params.reason ?? 'REFUND',
      type: 'CREDIT',
    });
  }

  async topup(params: TopupParams): Promise<CreditMutationResult> {
    return this.creditMutation({
      ...params,
      type: 'CREDIT',
    });
  }

  /**
   * Internal helper — dipakai oleh refund() dan topup() karena keduanya
   * sama-sama menambah balance (CREDIT), hanya beda default reason.
   * deduct() TIDAK memakai helper ini karena punya validasi balance minimum
   * yang berbeda arah (mengurangi, bukan menambah).
   */
  private async creditMutation(params: {
    userId: string;
    amount: number;
    reason: LedgerReasonType;
    referenceType: ReferenceTypeValue;
    referenceId?: string;
    note?: string;
    type: 'CREDIT';
  }): Promise<CreditMutationResult> {
    const { userId, amount, reason, referenceType, referenceId, note, type } = params;

    if (amount <= 0) {
      throw new Error('Jumlah harus lebih besar dari 0');
    }

    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ credit_balance: number }[]>`
        SELECT credit_balance FROM users WHERE id = ${userId} FOR UPDATE
      `;

      if (locked.length === 0) {
        throw new Error(`User ${userId} tidak ditemukan`);
      }

      const balanceBefore = locked[0].credit_balance;
      const balanceAfter = balanceBefore + amount;

      await tx.user.update({
        where: { id: userId },
        data: { creditBalance: balanceAfter },
      });

      const ledger = await tx.creditLedger.create({
        data: {
          userId,
          amount,
          balanceBefore,
          balanceAfter,
          type,
          reason,
          referenceType,
          referenceId,
          note,
        },
      });

      this.logger.log(
        `${type} ${amount} credit ke user ${userId} (${balanceBefore} → ${balanceAfter}), reason=${reason}`,
      );

      return {
        ledgerId: ledger.id,
        userId,
        amount,
        balanceBefore,
        balanceAfter,
      };
    });
  }
}