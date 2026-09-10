import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'
import { UserRepository } from '../user/user.repository'
import { generateSecret, generateURI, verify } from 'otplib'
import { HashingService } from '@/shared/services/hashing.service'
import { PrismaService } from '@/shared/services/prisma.service'
import { RecoveryCodeRepository } from '../recovery-code/recovery-code.repository'
import { randomBytes } from 'crypto'
import { EnableTwoFactorBodyDTO } from './auth.dto'
@Injectable()
export class TwoFactorService {
  private generateRecoveryCode() {
    const value = randomBytes(6).toString('hex').toUpperCase()

    return `${value.slice(0, 6)}-${value.slice(6)}`
  }
  constructor(
    private readonly userRepository: UserRepository,
    private readonly hashingService: HashingService,
    private readonly prismaService: PrismaService,
    private readonly recoveryCodeRepository: RecoveryCodeRepository,
  ) {}

  async setup(userId: number) {
    const user = await this.userRepository.findById(userId)
    if (!user) {
      throw new UnauthorizedException('User not found')
    }
    if (user.totpEnabled) {
      throw new ConflictException('Two-factor authentication is already enabled')
    }
    const secret = generateSecret()
    const otpauthUri = generateURI({
      issuer: 'Ecommerce',
      label: user.email,
      secret,
    })
    await this.userRepository.updateTotpSecret(userId, secret)
    return { secret, otpauthUri }
  }

  async verifyCode(secret: string, code: string) {
    const result = await verify({
      secret,
      token: code,
    })
    return result.valid
  }

  async enable(userId: number, body: EnableTwoFactorBodyDTO) {
    const user = await this.userRepository.findById(userId)
    if (!user) {
      throw new UnauthorizedException('User not found')
    }
    if (user.totpEnabled) {
      throw new ConflictException('Two-factor authentication is already enabled')
    }
    if (!user.totpSecret) {
      throw new UnauthorizedException('Two-factor authentication setup is required')
    }
    const isValid = await this.verifyCode(user.totpSecret, body.code)

    if (!isValid) {
      throw new UnauthorizedException('Invalid code')
    }
    const recoveryCodes = Array.from({ length: 8 }, () => this.generateRecoveryCode())
    const hashedRecoveryCodes = await Promise.all(recoveryCodes.map((code) => this.hashingService.hash(code)))
    await this.prismaService.$transaction(async (tx) => {
      await this.recoveryCodeRepository.deleteAllByUserId(userId, tx)

      await this.recoveryCodeRepository.createMany(
        hashedRecoveryCodes.map((codeHash) => ({
          userId,
          codeHash,
        })),
        tx,
      )

      await this.userRepository.enableTotp(userId, tx)
    })

    return {
      message: 'Two-factor authentication has been enabled',
      recoveryCodes,
    }
  }
}
