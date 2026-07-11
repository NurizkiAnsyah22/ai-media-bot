import { Injectable } from '@nestjs/common';
import { JobType } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

interface PricingKey {
  jobType: JobType;
  duration?: number; // durasi dalam detik, relevan untuk video
  mode?: string;      // contoh: 'std' | 'pro', relevan untuk kualitas/mode generation
}

/**
 * PricingService — sumber kebenaran tunggal untuk kalkulasi harga credit.
 *
 * Pricing saat ini di-hardcode in-code (bukan tabel DB) secara sengaja:
 * belum ada kebutuhan mengubah harga tanpa redeploy sampai Phase 9
 * (Admin — Pricing Rules Management). Memindahkan ini ke tabel sekarang
 * adalah over-engineering untuk kebutuhan yang belum ada.
 */
@Injectable()
export class PricingService {
  private readonly rules: Array<{ match: PricingKey; cost: number }> = [
    { match: { jobType: JobType.TEXT_TO_VIDEO, duration: 5, mode: 'std' }, cost: 20 },
    { match: { jobType: JobType.TEXT_TO_VIDEO, duration: 10, mode: 'std' }, cost: 35 },
    { match: { jobType: JobType.TEXT_TO_VIDEO, duration: 5, mode: 'pro' }, cost: 40 },
    { match: { jobType: JobType.TEXT_TO_VIDEO, duration: 10, mode: 'pro' }, cost: 70 },
    { match: { jobType: JobType.IMAGE_TO_VIDEO, duration: 5, mode: 'std' }, cost: 25 },
    { match: { jobType: JobType.IMAGE_TO_VIDEO, duration: 10, mode: 'std' }, cost: 45 },
    { match: { jobType: JobType.TEXT_TO_IMAGE, mode: 'std' }, cost: 5 },
    { match: { jobType: JobType.TEXT_TO_IMAGE, mode: 'pro' }, cost: 10 },
    { match: { jobType: JobType.IMAGE_UPSCALE, mode: 'std' }, cost: 8 },
  ];

  getCost(params: PricingKey): number {
    const found = this.rules.find(
      (rule) =>
        rule.match.jobType === params.jobType &&
        rule.match.duration === params.duration &&
        rule.match.mode === params.mode,
    );

    if (!found) {
  throw new BadRequestException(
    `Kombinasi tidak didukung: ${params.jobType}, duration=${params.duration}, mode=${params.mode}`,
  );
}

    return found.cost;
  }
}