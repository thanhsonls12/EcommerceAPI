import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { UserRepository } from './user.repository'
import { ChangePasswordBodyDTO, UpdateProfileBodyDto } from './user.dto'
import { HashingService } from '@/shared/services/hashing.service'
import { PrismaService } from '@/shared/services/prisma.service'
import { RefreshTokenRepository } from '../refresh-token/refresh-token.repository'
import { DeviceRepository } from '../device/device.repository'

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hashingService: HashingService,
    private readonly prismaService: PrismaService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly deviceRepository: DeviceRepository,
  ) {}

  findAll() {
    return this.userRepository.findMany()
  }

  async findById(id: number) {
    const user = await this.userRepository.findProfileById(id)

    if (!user) {
      throw new NotFoundException('User not found')
    }

    return user
  }

  async updateProfile(userId: number, body: UpdateProfileBodyDto) {
    if (body.phoneNumber) {
      const existingUser = await this.userRepository.findByPhoneNumber(body.phoneNumber)

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('Phone number already in use')
      }
    }

    return this.userRepository.updateProfile(userId, body)
  }

  async changePassword(userId: number, body: ChangePasswordBodyDTO) {
    const user = await this.userRepository.findById(userId)

    if (!user) {
      throw new NotFoundException('User not found')
    }

    const isPasswordCorrect = await this.hashingService.compare(body.currentPassword, user.password)

    if (!isPasswordCorrect) {
      throw new UnauthorizedException('Current password is incorrect')
    }

    const hashedPassword = await this.hashingService.hash(body.newPassword)

    await this.prismaService.$transaction(async (tx) => {
      await this.userRepository.updatePassword(userId, hashedPassword, tx)

      await this.refreshTokenRepository.deleteAllByUserId(userId, tx)

      await this.deviceRepository.deactivateAllByUserId(userId, tx)
    })

    return { message: 'Password changed successfully' }
  }
}
