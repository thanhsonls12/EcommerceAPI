import { Module } from '@nestjs/common'
import { RecoveryCodeRepository } from './recovery-code.repository'

@Module({
  providers: [RecoveryCodeRepository],
  exports: [RecoveryCodeRepository],
})
export class RecoveryCodeModule {}
