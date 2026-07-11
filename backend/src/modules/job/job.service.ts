import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JobStatus, JobType, AIProvider, Currency } from '@prisma/client';

interface CreateJobParams {
  userId: string;
  provider: AIProvider;
  type: JobType;
  prompt: string;
  metadata?: Record<string, unknown>;
}

/**
 * Transisi state yang diizinkan. Key = state asal, value = daftar state tujuan valid.
 * State transition di luar daftar ini akan ditolak (throw error),
 * sesuai DoD: "state transition divalidasi (tidak bisa loncat state sembarangan)".
 */
const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  PENDING: ['SUBMITTED', 'FAILED'],
  SUBMITTED: ['PROCESSING', 'FAILED'],
  PROCESSING: ['COMPLETED', 'FAILED'],
  COMPLETED: [], // state akhir, tidak ada transisi lanjutan
  FAILED: [],    // state akhir, tidak ada transisi lanjutan
};

@Injectable()
export class JobService {
  private readonly logger = new Logger(JobService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Membuat job baru dengan status awal PENDING, mencatat JobEvent 'created'.
   * TIDAK melakukan deduct credit di sini — itu tanggung jawab caller (Task 3.4)
   * setelah createJob() sukses DAN submit ke provider (simulasi) berhasil.
   */
  async createJob(params: CreateJobParams) {
    const { userId, provider, type, prompt, metadata } = params;

    return this.prisma.$transaction(async (tx) => {
      const job = await tx.mediaJob.create({
        data: {
          userId,
          provider,
          type,
          prompt,
          status: JobStatus.PENDING,
          metadata: metadata as any,
        },
      });

      await tx.jobEvent.create({
        data: {
          jobId: job.id,
          status: JobStatus.PENDING,
          note: 'Job dibuat',
        },
      });

      this.logger.log(`Job ${job.id} dibuat untuk user ${userId}, status=PENDING`);
      return job;
    });
  }

  /**
   * Transisi PENDING -> SUBMITTED, dipanggil setelah provider (simulasi/nyata)
   * berhasil menerima job dan mengembalikan providerJobId.
   */
  async markSubmitted(jobId: string, providerJobId: string) {
    return this.transitionState(jobId, JobStatus.SUBMITTED, {
      providerJobId,
      startedAt: new Date(),
    }, 'Job berhasil disubmit ke provider');
  }

  /**
   * Transisi ke PROCESSING — provider mengonfirmasi job sedang diproses.
   */
  async markProcessing(jobId: string) {
    return this.transitionState(jobId, JobStatus.PROCESSING, {}, 'Job sedang diproses provider');
  }

  /**
   * Transisi ke COMPLETED, menyimpan hasil.
   */
  async markCompleted(jobId: string, resultUrl: string) {
    return this.transitionState(
      jobId,
      JobStatus.COMPLETED,
      { resultUrl, completedAt: new Date() },
      'Job selesai',
    );
  }

  /**
   * Transisi ke FAILED. Refund credit adalah tanggung jawab CALLER
   * (JobService tidak tahu soal CreditService — menjaga separation of concern),
   * tapi method ini menyediakan info yang caller butuh untuk memutuskan refund.
   */
  async markFailed(jobId: string, errorMessage: string) {
    return this.transitionState(
      jobId,
      JobStatus.FAILED,
      { errorMessage, completedAt: new Date() },
      `Job gagal: ${errorMessage}`,
    );
  }

  async findById(jobId: string) {
    return this.prisma.mediaJob.findUniqueOrThrow({
      where: { id: jobId },
      include: { events: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async findByUser(userId: string, page: number = 1, pageSize: number = 20) {
    const skip = (page - 1) * pageSize;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.mediaJob.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.mediaJob.count({ where: { userId } }),
    ]);

    return { items, total, page, pageSize };
  }

  /**
   * Inti state machine — validasi transisi, update MediaJob, insert JobEvent,
   * semua dalam satu transaction. Method ini yang menegakkan DoD:
   * "state transition divalidasi (tidak bisa loncat state sembarangan)"
   * dan "Semua transisi state tercatat di job_events".
   */
  private async transitionState(
    jobId: string,
    newStatus: JobStatus,
    additionalData: Record<string, unknown>,
    eventNote: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.mediaJob.findUniqueOrThrow({ where: { id: jobId } });

      const allowedTransitions = VALID_TRANSITIONS[job.status];
      if (!allowedTransitions.includes(newStatus)) {
        throw new Error(
          `Transisi tidak valid: ${job.status} -> ${newStatus} untuk job ${jobId}`,
        );
      }

      const updated = await tx.mediaJob.update({
        where: { id: jobId },
        data: { status: newStatus, ...additionalData },
      });

      await tx.jobEvent.create({
        data: { jobId, status: newStatus, note: eventNote },
      });

      this.logger.log(`Job ${jobId}: ${job.status} -> ${newStatus}`);
      return updated;
    });
  }
}