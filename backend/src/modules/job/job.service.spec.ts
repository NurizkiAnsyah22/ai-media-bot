import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { JobService } from './job.service';
import { JobStatus } from '@prisma/client';

describe('JobService (integration)', () => {
  let jobService: JobService;
  let prisma: PrismaService;
  let testUserId: string;

  const testTelegramId = BigInt(`8${Date.now()}`);

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JobService, PrismaService],
    }).compile();

    jobService = module.get<JobService>(JobService);
    prisma = module.get<PrismaService>(PrismaService);
    await prisma.$connect();

    const user = await prisma.user.create({
      data: {
        telegramId: testTelegramId,
        firstName: 'Test Job User',
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    await prisma.jobEvent.deleteMany({
      where: { job: { userId: testUserId } },
    });
    await prisma.mediaJob.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  describe('createJob', () => {
    it('membuat job dengan status PENDING dan mencatat event', async () => {
      const job = await jobService.createJob({
        userId: testUserId,
        provider: 'KLING',
        type: 'TEXT_TO_IMAGE',
        prompt: 'test prompt',
      });

      expect(job.status).toBe(JobStatus.PENDING);

      const events = await prisma.jobEvent.findMany({ where: { jobId: job.id } });
      expect(events).toHaveLength(1);
      expect(events[0].status).toBe(JobStatus.PENDING);
    });
  });

  describe('valid state transitions', () => {
    it('PENDING -> SUBMITTED -> PROCESSING -> COMPLETED, setiap transisi tercatat', async () => {
      const job = await jobService.createJob({
        userId: testUserId,
        provider: 'KLING',
        type: 'TEXT_TO_IMAGE',
        prompt: 'test prompt lifecycle',
      });

      await jobService.markSubmitted(job.id, 'provider-job-123');
      await jobService.markProcessing(job.id);
      const completed = await jobService.markCompleted(job.id, 'https://example.com/result.png');

      expect(completed.status).toBe(JobStatus.COMPLETED);
      expect(completed.resultUrl).toBe('https://example.com/result.png');

      const events = await prisma.jobEvent.findMany({
        where: { jobId: job.id },
        orderBy: { createdAt: 'asc' },
      });

      // created (PENDING) + SUBMITTED + PROCESSING + COMPLETED = 4 event
      expect(events).toHaveLength(4);
      expect(events.map((e) => e.status)).toEqual([
        JobStatus.PENDING,
        JobStatus.SUBMITTED,
        JobStatus.PROCESSING,
        JobStatus.COMPLETED,
      ]);
    });

    it('PENDING -> FAILED (gagal sebelum submit)', async () => {
      const job = await jobService.createJob({
        userId: testUserId,
        provider: 'KLING',
        type: 'TEXT_TO_IMAGE',
        prompt: 'test prompt fail early',
      });

      const failed = await jobService.markFailed(job.id, 'Provider tidak merespons');
      expect(failed.status).toBe(JobStatus.FAILED);
      expect(failed.errorMessage).toBe('Provider tidak merespons');
    });
  });

  describe('invalid state transitions', () => {
    it('menolak transisi PENDING -> PROCESSING (loncat state)', async () => {
      const job = await jobService.createJob({
        userId: testUserId,
        provider: 'KLING',
        type: 'TEXT_TO_IMAGE',
        prompt: 'test prompt invalid transition',
      });

      await expect(jobService.markProcessing(job.id)).rejects.toThrow(
        'Transisi tidak valid',
      );

      // Pastikan status TIDAK berubah setelah percobaan transisi gagal
      const unchanged = await prisma.mediaJob.findUniqueOrThrow({ where: { id: job.id } });
      expect(unchanged.status).toBe(JobStatus.PENDING);
    });

    it('menolak transisi dari state akhir (COMPLETED -> apapun)', async () => {
      const job = await jobService.createJob({
        userId: testUserId,
        provider: 'KLING',
        type: 'TEXT_TO_IMAGE',
        prompt: 'test prompt final state',
      });

      await jobService.markSubmitted(job.id, 'provider-job-456');
      await jobService.markProcessing(job.id);
      await jobService.markCompleted(job.id, 'https://example.com/done.png');

      await expect(jobService.markProcessing(job.id)).rejects.toThrow(
        'Transisi tidak valid',
      );
    });
  });

  describe('findByUser', () => {
    it('mengembalikan job milik user dengan pagination', async () => {
      const result = await jobService.findByUser(testUserId, 1, 20);
      expect(result.total).toBeGreaterThan(0);
      expect(result.items.every((job) => job.userId === testUserId)).toBe(true);
    });
  });
});