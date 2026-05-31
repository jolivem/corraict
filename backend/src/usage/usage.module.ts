import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { QuotaService } from './quota.service';
import { UsageController } from './usage.controller';
import { UsageRetentionService } from './usage-retention.service';
import { UsageService } from './usage.service';

@Module({
  imports: [AuthModule],
  controllers: [UsageController],
  providers: [UsageService, QuotaService, UsageRetentionService],
  exports: [UsageService, QuotaService, UsageRetentionService],
})
export class UsageModule {}
