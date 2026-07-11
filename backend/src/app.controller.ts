import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("health")
  health() {
    return {
      status: "ok",
      service: "ai-media-backend",
      version: "0.0.1",
    };
  }

  @Get("test-db")
  async testDb() {
    try {
      const userCount = await this.prisma.user.count();
      return { 
        message: 'Database terkoneksi dengan sukses!', 
        userCount 
      };
    } catch (error) {
      return { 
        message: 'Gagal terhubung ke database', 
        error: (error as Error).message 
      };
    }
  }

  // --- Task 1.7: Health & Readiness ---
  @Get('health/live')
  live() {
    return { status: 'ok' };
  }

  @Get('health/ready')
  async ready() {
    try {
      await this.prisma.user.count();
      return { status: 'ok', database: 'connected' };
    } catch (error) {
      return { status: 'error', database: 'disconnected' };
    }
  }
}