import { Module } from '@nestjs/common';
import { MigrationController } from './migration.controller';
import { MigrationService } from './migration.service';

@Module({
  controllers: [MigrationController],
  providers: [MigrationService]
})
export class MigrationModule {}
