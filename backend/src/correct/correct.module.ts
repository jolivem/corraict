import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsageModule } from '../usage/usage.module';
import { CorrectController } from './correct.controller';
import { CorrectService } from './correct.service';
import { MistralClient } from './mistral.client';

@Module({
  imports: [AuthModule, UsageModule],
  controllers: [CorrectController],
  providers: [CorrectService, MistralClient],
})
export class CorrectModule {}
