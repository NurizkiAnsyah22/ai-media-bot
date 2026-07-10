import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common'; // 1. Import ini

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 2. Tambahkan Global Pipe di sini
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,         // Menghapus property yang tidak ada di DTO
    forbidNonWhitelisted: true, // Error jika client mengirim property tambahan
    transform: true,         // Auto-transform input ke class instance DTO
  }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('AI Media Bot API')
    .setDescription('Backend API for Telegram AI Media Bot')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const configService = app.get(ConfigService);

  app.setGlobalPrefix(
    `${configService.get('API_PREFIX')}/${configService.get('API_VERSION')}`,
  );

  const port = configService.get<number>('PORT') || 3000;

  // Tambahkan di dalam fungsi bootstrap() di main.ts
// ... kode lainnya ...

// Tambahkan blok ini untuk menangani BigInt ke JSON
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

  await app.listen(port);

  console.log(
    `🚀 Server running at http://localhost:${port}/${configService.get(
      'API_PREFIX',
    )}/${configService.get('API_VERSION')}`,
  );
}

bootstrap();