import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TrpcModule } from '@server/trpc/trpc.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration, { ConfigurationType } from './configuration';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { FeedsModule } from './feeds/feeds.module';
import { ImageService } from './utils/image.service';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    TrpcModule,
    FeedsModule,
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [configuration],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory(config: ConfigService) {
        const throttler =
          config.get<ConfigurationType['throttler']>('throttler');
        return [
          {
            ttl: 60,
            limit: throttler?.maxRequestPerMinute || 60,
          },
        ];
      },
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
      serveRoot: '/',
    }),
  ],
  controllers: [AppController],
  providers: [AppService, ImageService],
})
export class AppModule {}
