import { Module } from '@nestjs/common';
import { JobService } from './job.service';
import { JobController } from './job.controller';
import { UserJobsController } from './user-jobs.controller';
import { SchedulerJobExecutor } from './executors/scheduler-job-executor.service';
import { JOB_EXECUTOR } from './interfaces/job-executor.interface';
import { CreditModule } from '../credit/credit.module';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [CreditModule, PricingModule],
  controllers: [JobController, UserJobsController],
  providers: [
    JobService,
    {
      provide: JOB_EXECUTOR,
      useClass: SchedulerJobExecutor,
    },
  ],
  exports: [JobService, JOB_EXECUTOR],
})
export class JobModule {}