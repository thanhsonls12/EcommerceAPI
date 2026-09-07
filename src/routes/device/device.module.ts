import { Module } from '@nestjs/common'
import { DeviceRepository } from './device.repository'

@Module({
  providers: [DeviceRepository],
  exports: [DeviceRepository],
})
export class DeviceModule {}
