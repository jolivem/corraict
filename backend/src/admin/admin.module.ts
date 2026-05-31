import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsageModule } from '../usage/usage.module';
import { AdminBootstrapService } from './admin-bootstrap.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from './guards/admin.guard';

@Module({
  imports: [AuthModule, UsageModule],
  controllers: [AdminController],
  providers: [AdminBootstrapService, AdminService, AdminGuard],
})
export class AdminModule {}
