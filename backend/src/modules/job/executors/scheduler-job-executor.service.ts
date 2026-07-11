import { Injectable, Logger } from '@nestjs/common';
import type { MediaJob } from '@prisma/client';
import type { IJobExecutor } from '../interfaces/job-executor.interface';

/**
 * Implementasi awal IJobExecutor menggunakan simulasi sederhana
 * (bukan @nestjs/schedule aktif dulu — polling interval baru relevan
 * setelah ada logic nyata di Task 4.2). Untuk Phase 3, cukup simulasi
 * langsung sukses, supaya JobService/endpoint (Task 3.4) bisa diuji
 * end-to-end tanpa bergantung provider AI sungguhan.
 *
 * DIGANTI di Task 4.2 dengan panggilan nyata ke KlingAIAdapter,
 * lalu di-retire sepenuhnya di Phase 6 saat QueueJobExecutor
 * menggantikannya lewat DI binding.
 */
@Injectable()
export class SchedulerJobExecutor implements IJobExecutor {
  private readonly logger = new Logger(SchedulerJobExecutor.name);

  async execute(job: MediaJob): Promise<{ providerJobId: string }> {
    this.logger.log(`[SIMULASI] Submit job ${job.id} ke provider ${job.provider}`);

    // Simulasi: provider selalu sukses menerima job untuk saat ini.
    const providerJobId = `sim-${job.id}`;
    return { providerJobId };
  }

  async checkStatus(job: MediaJob) {
    this.logger.log(`[SIMULASI] Cek status job ${job.id}`);

    // Simulasi: langsung dianggap completed.
    return {
      status: 'completed' as const,
      resultUrl: `https://example.com/simulated-result/${job.id}.png`,
    };
  }
}