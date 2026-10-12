import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService, ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = process.env.REDIS_URL;
        if (redisUrl) {
          const url = new URL(redisUrl);
          return {
            connection: {
              host: url.hostname,
              port: Number(url.port || 6379),
              username: url.username ? decodeURIComponent(url.username) : undefined,
              password: url.password ? decodeURIComponent(url.password) : undefined,
              tls: url.protocol === 'rediss:' ? {} : undefined,
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
