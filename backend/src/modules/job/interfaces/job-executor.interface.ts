import type { MediaJob } from '@prisma/client';

/**
 * Kontrak eksekusi job — didesain SAMA PERSIS dengan yang akan dipakai
 * BullMQ di Phase 6 (lihat blueprint §0, "Poor Man's Queue" strategy).
 *
 * Implementasi saat ini (SchedulerJobExecutor) hanya skeleton simulasi.
 * Implementasi nyata (panggil Kling AI) baru masuk di Phase 4 (Task 4.2),
 * dan swap ke BullMQ (QueueJobExecutor) di Phase 6 — TANPA mengubah
 * interface ini maupun JobService/endpoint yang memakainya.
 */
export interface IJobExecutor {
  /** Submit job ke provider AI (atau simulasi). */
  execute(job: MediaJob): Promise<{ providerJobId: string }>;

  /** Cek status job yang sedang berjalan di provider (atau simulasi). */
  checkStatus(job: MediaJob): Promise<{ status: 'processing' | 'completed' | 'failed'; resultUrl?: string; errorMessage?: string }>;
}

export const JOB_EXECUTOR = Symbol('JOB_EXECUTOR');