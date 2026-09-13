import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { UserRepository } from './user.repository'
import { ChangePasswordBodyDTO, UpdateProfileBodyDto } from './user.dto'
import { HashingService } from '@/shared/services/hashing.service'
import { PrismaService } from '@/shared/services/prisma.service'
import { RefreshTokenRepository } from '../refresh-token/refresh-token.repository'
import { DeviceRepository } from '../device/device.repository'
import { MESSAGE } from '@/shared/constants/message.constant'

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
      throw new NotFoundException(MESSAGE.AUTH.USER_NOT_FOUND)
    }

    return user
  }

  async updateProfile(userId: number, body: UpdateProfileBodyDto) {
    if (body.phoneNumber) {
      const existingUser = await this.userRepository.findByPhoneNumber(body.phoneNumber)

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException(MESSAGE.USER.PHONE_NUMBER_ALREADY_IN_USE)
      }
    }

    return this.userRepository.updateProfile(userId, body)
  }

  async changePassword(userId: number, body: ChangePasswordBodyDTO) {
    const user = await this.userRepository.findById(userId)

    if (!user) {
      throw new NotFoundException(MESSAGE.AUTH.USER_NOT_FOUND)
    }

    const isPasswordCorrect = await this.hashingService.compare(body.currentPassword, user.password)

    if (!isPasswordCorrect) {
      throw new UnauthorizedException(MESSAGE.USER.CURRENT_PASSWORD_INCORRECT)
    }

    const hashedPassword = await this.hashingService.hash(body.newPassword)

    await this.prismaService.$transaction(async (tx) => {
      await this.userRepository.updatePassword(userId, hashedPassword, tx)

      await this.refreshTokenRepository.deleteAllByUserId(userId, tx)

      await this.deviceRepository.deactivateAllByUserId(userId, tx)
    })

    return { message: MESSAGE.USER.PASSWORD_CHANGED_SUCCESSFULLY }
  }
}
