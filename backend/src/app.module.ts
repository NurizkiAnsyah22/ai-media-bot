import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module'; // Langkah 1: Import module baru yang sudah Anda buat
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    UserModule, // Langkah 2: Daftarkan PrismaModule di dalam array imports
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}