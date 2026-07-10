import { IsString, IsOptional, Matches } from 'class-validator';
import type { SyncUserRequest } from '@ai-media-bot/contracts';

export class SyncUserDto implements SyncUserRequest {
  @Matches(/^\d+$/, { message: 'telegramId must be a numeric string' })
  telegramId: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  languageCode?: string;
}