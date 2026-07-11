import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import type { AxiosError } from 'axios';
import type {
  SyncUserRequest,
  SyncUserResponse,
  CreditBalanceResponse,
} from '@ai-media-bot/contracts';

@Injectable()
export class ApiClientService {
  private readonly logger = new Logger(ApiClientService.name);
  private readonly retryCount: number;

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.retryCount = this.configService.get<number>('HTTP_RETRY_COUNT') ?? 1;
  }

  async syncUser(
    payload: SyncUserRequest,
    correlationId: string,
  ): Promise<SyncUserResponse> {
    return this.post<SyncUserResponse>('/user/sync', payload, correlationId);
  }

  async getCreditBalance(
    userId: string,
    correlationId: string,
  ): Promise<CreditBalanceResponse> {
    return this.get<CreditBalanceResponse>(`/user/${userId}/credits`, correlationId);
  }

  private async post<T>(
    url: string,
    data: unknown,
    correlationId: string,
  ): Promise<T> {
    const totalAttempts = this.retryCount + 1; // retry 1x = 2 total attempts
    let lastError: unknown;

    for (let attempt = 1; attempt <= totalAttempts; attempt++) {
      try {
        const response = await firstValueFrom(
          this.http.post<T>(url, data, {
            headers: { 'X-Correlation-ID': correlationId },
          }),
        );
        return response.data;
      } catch (err) {
        lastError = err;
        const axiosErr = err as AxiosError;
        const status = axiosErr.response?.status;
        const responseData = JSON.stringify(axiosErr.response?.data ?? {});
        const errCode = (axiosErr as any).code;
        this.logger.warn(
          `[${correlationId}] POST ${url} gagal (percobaan ${attempt}/${totalAttempts}): status=${status} code=${errCode} message=${axiosErr.message} data=${responseData}`,
        );
      }
    }

    throw lastError;
  }

  private async get<T>(url: string, correlationId: string): Promise<T> {
    const totalAttempts = this.retryCount + 1;
    let lastError: unknown;

    for (let attempt = 1; attempt <= totalAttempts; attempt++) {
      try {
        const response = await firstValueFrom(
          this.http.get<T>(url, {
            headers: { 'X-Correlation-ID': correlationId },
          }),
        );
        return response.data;
      } catch (err) {
        lastError = err;
        const axiosErr = err as AxiosError;
        const status = axiosErr.response?.status;
        const responseData = JSON.stringify(axiosErr.response?.data ?? {});
        const errCode = (axiosErr as any).code;
        this.logger.warn(
          `[${correlationId}] GET ${url} gagal (percobaan ${attempt}/${totalAttempts}): status=${status} code=${errCode} message=${axiosErr.message} data=${responseData}`,
        );
      }
    }

    throw lastError;
  }
}