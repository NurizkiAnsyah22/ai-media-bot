import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { CreditService } from './credit.service';
import { InsufficientCreditException } from './exceptions/insufficient-credit.exception';

describe('CreditService (integration)', () => {
  let creditService: CreditService;
  let prisma: PrismaService;
  let testUserId: string;

  // telegramId dummy unik per test run, supaya tidak bentrok dengan data lain
  const testTelegramId = BigInt(`9${Date.now()}`);

  beforeAll(async () => {
  const module: TestingModule = await Test.createTestingModule({
    providers: [CreditService, PrismaService],
  }).compile();

  creditService = module.get<CreditService>(CreditService);
  prisma = module.get<PrismaService>(PrismaService);
  await prisma.$connect();

  const user = await prisma.user.create({
    data: {
      telegramId: testTelegramId,
      firstName: 'Test Credit User',
      creditBalance: 0, // mulai dari 0, sesuai desain: opening balance tidak butuh ledger
    },
  });
  testUserId = user.id;

  // Danai user test LEWAT service, supaya tercatat di ledger (menjaga invariant sejak awal)
  await creditService.topup({
    userId: testUserId,
    amount: 1000,
    reason: 'ADMIN_ADJUSTMENT',
    referenceType: 'MANUAL',
    note: 'Initial balance untuk testing',
  });
});

  afterAll(async () => {
    // Cleanup — hapus ledger dulu (FK constraint), baru user
    await prisma.creditLedger.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  describe('getBalance', () => {
    it('mengembalikan balance user yang benar', async () => {
      const balance = await creditService.getBalance(testUserId);
      expect(balance).toBe(1000);
    });
  });

  describe('deduct', () => {
    it('mengurangi balance dan mencatat ledger dengan benar', async () => {
      const result = await creditService.deduct({
        userId: testUserId,
        amount: 100,
        reason: 'GENERATE_IMAGE',
        referenceType: 'MEDIA_JOB',
        referenceId: 'dummy-job-1',
      });

      expect(result.balanceBefore).toBe(1000);
      expect(result.balanceAfter).toBe(900);

      const ledger = await prisma.creditLedger.findUnique({
        where: { id: result.ledgerId },
      });
      expect(ledger).not.toBeNull();
      expect(ledger?.type).toBe('DEBIT');
      expect(ledger?.amount).toBe(100);

      const balance = await creditService.getBalance(testUserId);
      expect(balance).toBe(900);
    });

    it('menolak deduct yang melebihi balance, balance tidak berubah', async () => {
      const balanceBefore = await creditService.getBalance(testUserId);

      await expect(
        creditService.deduct({
          userId: testUserId,
          amount: 999999,
          reason: 'GENERATE_IMAGE',
          referenceType: 'MEDIA_JOB',
        }),
      ).rejects.toThrow(InsufficientCreditException);

      const balanceAfter = await creditService.getBalance(testUserId);
      expect(balanceAfter).toBe(balanceBefore); // tidak berubah sama sekali
    });
  });

  describe('refund', () => {
    it('menambah balance dan mencatat ledger type CREDIT', async () => {
      const balanceBefore = await creditService.getBalance(testUserId);

      const result = await creditService.refund({
        userId: testUserId,
        amount: 50,
        referenceType: 'MEDIA_JOB',
        referenceId: 'dummy-job-1',
      });

      expect(result.balanceAfter).toBe(balanceBefore + 50);

      const ledger = await prisma.creditLedger.findUnique({
        where: { id: result.ledgerId },
      });
      expect(ledger?.type).toBe('CREDIT');
      expect(ledger?.reason).toBe('REFUND');
    });
  });

  describe('topup', () => {
    it('menambah balance dan mencatat ledger dengan reason TOPUP', async () => {
      const balanceBefore = await creditService.getBalance(testUserId);

      const result = await creditService.topup({
        userId: testUserId,
        amount: 200,
        reason: 'TOPUP',
        referenceType: 'PAYMENT',
        referenceId: 'dummy-payment-1',
      });

      expect(result.balanceAfter).toBe(balanceBefore + 200);
    });
  });

  describe('concurrency — concurrent deduct pada user yang sama', () => {
  it('tidak menghasilkan balance negatif saat 2 deduct bersamaan melebihi balance total', async () => {
    const currentBalance = await creditService.getBalance(testUserId);
    // Amount dihitung relatif terhadap balance SAAT INI (bukan reset manual),
    // supaya total 2x amount > currentBalance, memaksa tepat satu gagal.
    const amountPerDeduct = Math.floor(currentBalance / 2) + 10;

    const results = await Promise.allSettled([
      creditService.deduct({
        userId: testUserId,
        amount: amountPerDeduct,
        reason: 'GENERATE_IMAGE',
        referenceType: 'MEDIA_JOB',
        referenceId: 'concurrent-1',
      }),
      creditService.deduct({
        userId: testUserId,
        amount: amountPerDeduct,
        reason: 'GENERATE_IMAGE',
        referenceType: 'MEDIA_JOB',
        referenceId: 'concurrent-2',
      }),
    ]);

    const succeeded = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);

    const finalBalance = await creditService.getBalance(testUserId);
    expect(finalBalance).toBe(currentBalance - amountPerDeduct);
    expect(finalBalance).toBeGreaterThanOrEqual(0);
  });
});

  describe('invariant — creditBalance harus selalu sama dengan SUM ledger', () => {
    it('users.creditBalance === SUM(CreditLedger.amount) setelah serangkaian operasi', async () => {
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: testUserId },
        select: { creditBalance: true },
      });

      const ledgers = await prisma.creditLedger.findMany({
        where: { userId: testUserId },
      });

      const sumFromLedger = ledgers.reduce((acc, entry) => {
        return entry.type === 'CREDIT' ? acc + entry.amount : acc - entry.amount;
      }, 0);

      expect(user.creditBalance).toBe(sumFromLedger);
    });
  });
});