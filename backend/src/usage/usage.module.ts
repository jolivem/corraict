import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { QuotaService } from './quota.service';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';

@Module({
  imports: [AuthModule],
  controllers: [UsageController],
  providers: [UsageService, QuotaService],
  exports: [UsageService, QuotaService],
})
export class UsageModule {}
