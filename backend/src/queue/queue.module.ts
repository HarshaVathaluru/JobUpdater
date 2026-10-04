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
        try {
          const u = new URL(redisUrl);
          return {
            connection: {
              host: u.hostname,
              port: Number(u.port || 6379),
              username: u.username || 'default',
              password: u.password || undefined,
              tls: u.protocol === 'rediss:' || u.hostname.includes('upstash.io') ? { rejectUnauthorized: false } : undefined,
              maxRetriesPerRequest: null,
              enableReadyCheck: false,
              retryStrategy: (times: number) => Math.min(times * 1000, 10000),
            },
          };
        } catch {
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
        }
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
  exports: [BullModule],
})
export class QueueModule {}
