import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL || "postgresql://ai_media_user:ai_media_secure_password_2026@localhost:5433/ai_media_db?schema=public";
    
    // Inisialisasi native driver PostgreSQL
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    // Inject adapter ke dalam Prisma Client sesuai permintaan arsitektur Prisma 7
    super({ adapter });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✔ Berhasil terhubung ke database PostgreSQL di Port 5433.');
    } catch (error) {
      this.logger.error('❌ Gagal menyambungkan koneksi ke database PostgreSQL:', (error as Error).message);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Koneksi database PostgreSQL diputus secara bersih.');
  }
}