import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks(); // wajib, supaya onModuleDestroy() di TelegramService benar-benar terpanggil
  await app.listen(3001); // beda port dari backend (3000)
}
bootstrap();