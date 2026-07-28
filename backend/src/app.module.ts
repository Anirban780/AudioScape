import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TracksModule } from './tracks/tracks.module';
import { ListenHistoryModule } from './history/history.module';
import { AppController } from './app.controller';

@Module({
  imports: [PrismaModule, AuthModule, TracksModule, ListenHistoryModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
