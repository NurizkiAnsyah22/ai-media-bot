import { Module } from '@nestjs/common';
import { JobService } from './job.service';
import { SchedulerJobExecutor } from './executors/scheduler-job-executor.service';
import { JOB_EXECUTOR } from './interfaces/job-executor.interface';

@Module({
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