import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Decorator ini membuat modul ini bisa diakses langsung di modul manapun tanpa di-import ulang
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Meng-export service agar bisa di-inject via constructor di modul lain
})
export class PrismaModule {}