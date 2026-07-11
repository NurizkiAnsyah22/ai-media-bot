import { Controller, Post, Get, Param, Body, Inject, Logger } from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { JobService } from './job.service';
import { CreditService } from '../credit/credit.service';
import { PricingService } from '../pricing/pricing.service';
import { JOB_EXECUTOR } from './interfaces/job-executor.interface';
import type { IJobExecutor } from './interfaces/job-executor.interface';


@Controller('jobs')
export class JobController {
  private readonly logger = new Logger(JobController.name);

  constructor(
    private readonly jobService: JobService,
    private readonly creditService: CreditService,
    private readonly pricingService: PricingService,
    @Inject(JOB_EXECUTOR) private readonly jobExecutor: IJobExecutor,
  ) {}

  @Post()
  async create(@Body() dto: CreateJobDto) {
    const cost = this.pricingService.getCost({
      jobType: dto.type,
      duration: dto.duration,
      mode: dto.mode,
    });

    // Step 1: buat job dengan status PENDING (belum ada mutasi credit)
    const job = await this.jobService.createJob({
      userId: dto.userId,
      provider: dto.provider,
      type: dto.type,
      prompt: dto.prompt,
    });

    try {
      // Step 2: submit ke provider (simulasi/nyata via IJobExecutor)
      const { providerJobId } = await this.jobExecutor.execute(job);
      let deducted = false;

      try {
        // Step 3: submit sukses -> deduct credit
        await this.creditService.deduct({
          userId: dto.userId,
          amount: cost,
          reason: this.mapJobTypeToReason(dto.type),
          referenceType: 'MEDIA_JOB',
          referenceId: job.id,
        });
        deducted = true;

        // Step 4: deduct sukses -> mark submitted
        const updatedJob = await this.jobService.markSubmitted(job.id, providerJobId);
        this.logger.log(`Job ${job.id} berhasil dibuat & submitted, cost=${cost}`);
        return updatedJob;
      } catch (innerErr) {
        if (deducted) {
          // Deduct sudah sukses tapi markSubmitted gagal -> refund otomatis
          await this.creditService.refund({
            userId: dto.userId,
            amount: cost,
            referenceType: 'MEDIA_JOB',
            referenceId: job.id,
            note: 'Refund otomatis: markSubmitted gagal setelah deduct',
          });
          this.logger.warn(
            `Job ${job.id}: deduct berhasil tapi markSubmitted gagal, refund dilakukan`,
          );
        }
        throw innerErr;
      }
    } catch (err) {
      // Submit ke provider gagal, ATAU (deduct gagal / markSubmitted gagal
      // dari blok di atas) -> job di-mark failed.
      const errorMessage = (err as Error).message;
      this.logger.error(`Job ${job.id} gagal: ${errorMessage}`);
      await this.jobService.markFailed(job.id, errorMessage);
      throw err;
    }
  }

  @Get(':id')
async findOne(@Param('id') id: string) {
  return this.jobService.findById(id);
}

  private mapJobTypeToReason(type: string): 'GENERATE_VIDEO' | 'GENERATE_IMAGE' {
    return type.includes('VIDEO') ? 'GENERATE_VIDEO' : 'GENERATE_IMAGE';
  }
}