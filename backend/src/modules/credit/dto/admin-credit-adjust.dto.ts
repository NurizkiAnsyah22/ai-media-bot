import { IsInt, IsPositive, IsString, IsOptional, IsIn } from 'class-validator';

const ALLOWED_REASONS = ['BONUS', 'ADMIN_ADJUSTMENT'] as const;

export class AdminCreditAdjustDto {
  @IsInt()
  @IsPositive()
  amount: number;

  @IsIn(ALLOWED_REASONS)
  reason: 'BONUS' | 'ADMIN_ADJUSTMENT';

  @IsOptional()
  @IsString()
  note?: string;
}