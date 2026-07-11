import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './modules/user/user.module';
import { envValidationSchema } from './config/env.validation';
import { CreditModule } from './modules/credit/credit.module';
import { PricingModule } from './modules/pricing/pricing.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      envFilePath: `.env`,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : { target: 'pino-pretty' },
        genReqId: (req) => {
          // Prioritaskan correlation ID dari bot (header X-Correlation-ID),
          // fallback generate baru kalau tidak ada (misal akses langsung via Postman/browser)
          const existing = req.headers['x-correlation-id'];
          return typeof existing === 'string' ? existing : randomUUID();
        },
      },
    }),
    PrismaModule,
    UserModule,
    CreditModule,
    PricingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}