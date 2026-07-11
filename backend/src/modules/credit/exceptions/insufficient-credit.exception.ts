import { BadRequestException } from '@nestjs/common';

export class InsufficientCreditException extends BadRequestException {
  constructor(userId: string, requested: number, available: number) {
    super({
      message: 'Saldo credit tidak mencukupi',
      userId,
      requested,
      available,
    });
  }
}