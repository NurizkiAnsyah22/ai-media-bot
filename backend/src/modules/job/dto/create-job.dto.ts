import { IsString, IsEnum, IsOptional, IsInt, Min, IsIn } from 'class-validator';
import { JobType, AIProvider } from '@prisma/client';

export class CreateJobDto {
  @IsString()
  userId: string;

  @IsEnum(AIProvider)
  provider: AIProvider;

  @IsEnum(JobType)
  type: JobType;

  @IsString()
  prompt: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number;

  @IsOptional()
  @IsIn(['std', 'pro'])
  mode?: string;
}