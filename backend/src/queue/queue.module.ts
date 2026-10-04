import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService, ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        let redisUrl = process.env.REDIS_URL;
        if (!redisUrl || redisUrl.includes('localhost') || redisUrl.includes('127.0.0.1')) {
          redisUrl = 'rediss://default:gQAAAAAAAvruAAIgcDE5ODJiYTliNDAzMDk0YzVmODAyYjgwZTMxN2YyZGRkNA@coherent-ant-195310.upstash.io:6379';
        }
        if (redisUrl.includes('upstash.io') && redisUrl.startsWith('redis://')) {
          redisUrl = redisUrl.replace('redis://', 'rediss://');
        }
        return {
          connection: {
            url: redisUrl,
            tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            retryStrategy: (times: number) => Math.min(times * 1000, 10000),
          },
        };
        return {
          connection: {
            host: configService.get<string>('redis.host') || 'localhost',
            port: configService.get<number>('redis.port') || 6379,
            password: configService.get<string>('redis.password') || undefined,
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            retryStrategy: (times: number) => Math.min(times * 1000, 10000),
          },
        };
      },
    }),
  ],
})
export class QueueModule {}
