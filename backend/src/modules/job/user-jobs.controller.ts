import { Controller, Get, Param, Query } from '@nestjs/common';
import { JobService } from './job.service';
import { CreditHistoryQueryDto } from '../credit/dto/credit-history-query.dto';

@Controller('user/:id/jobs')
export class UserJobsController {
  constructor(private readonly jobService: JobService) {}

  @Get()
  async findByUser(
    @Param('id') userId: string,
    @Query() query: CreditHistoryQueryDto,
  ) {
    return this.jobService.findByUser(userId, query.page, query.pageSize);
  }
}