import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  if (!process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.length < 32)) {
    throw new Error('JWT_SECRET is required; production must use a random secret with at least 32 characters.');
  }
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  
  app.setGlobalPrefix('api');
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  app.enableCors({
    origin: true,
    credentials: true,
  });
  
  const port = process.env.PORT || configService.get<number>('port') || 3001;
  await app.listen(port, '0.0.0.0');
}
bootstrap();
