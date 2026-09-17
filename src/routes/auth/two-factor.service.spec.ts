jest.mock('otplib', () => ({
  generateSecret: jest.fn(),
  generateURI: jest.fn(),
  verify: jest.fn(),
}))

jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomBytes: jest.fn(),
}))

import { Test } from '@nestjs/testing'
import { generateSecret, generateURI, verify } from 'otplib'
import { randomBytes } from 'crypto'
import { TwoFactorService } from './two-factor.service'
import { UserRepository } from '../user/user.repository'
import { HashingService } from '@/shared/services/hashing.service'
import { PrismaService } from '@/shared/services/prisma.service'
import { RecoveryCodeRepository } from '../recovery-code/recovery-code.repository'
import { Prisma, UserStatus } from '../../../generated/prisma/client'

describe('TwoFactorService', () => {
  let service: TwoFactorService

  const userRepository = {
    findById: jest.fn(),
    updateTotpSecret: jest.fn(),
    enableTotp: jest.fn(),
    disableTotp: jest.fn(),
  }

  const hashingService = {
    hash: jest.fn(),
    compare: jest.fn(),
  }

  const recoveryCodeRepository = {
    createMany: jest.fn(),
    deleteAllByUserId: jest.fn(),
    findUnusedByUserId: jest.fn(),
  }

  const tx = {} as Prisma.TransactionClient

  const prismaService = {
    $transaction: jest.fn((callback: (transaction: Prisma.TransactionClient) => unknown) => callback(tx)),
  }

  const generateSecretMock = jest.mocked(generateSecret)
  const generateURIMock = jest.mocked(generateURI)
  const verifyMock = jest.mocked(verify)
  const randomBytesMock = randomBytes as unknown as jest.Mock

  const buildUser = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    email: 'test@example.com',
    password: 'hashed-password',
    name: 'Test User',
    phoneNumber: '0912345678',
    avatar: null,
    status: UserStatus.ACTIVE,
    roleId: 2,
    totpSecret: null,
    totpEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: null,
    updatedById: null,
    deletedAt: null,
    ...overrides,
  })

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        TwoFactorService,
        { provide: UserRepository, useValue: userRepository },
        { provide: HashingService, useValue: hashingService },
        { provide: PrismaService, useValue: prismaService },
        { provide: RecoveryCodeRepository, useValue: recoveryCodeRepository },
      ],
    }).compile()

    service = moduleRef.get(TwoFactorService)

    jest.clearAllMocks()
    prismaService.$transaction.mockImplementation((callback) => callback(tx))
  })

  describe('setup', () => {
    it('creates and stores a TOTP secret', async () => {
      const user = buildUser()
      userRepository.findById.mockResolvedValue(user)
      generateSecretMock.mockReturnValue('TOTP-SECRET')
      generateURIMock.mockReturnValue('otpauth://totp/Ecommerce:test@example.com')

      const result = await service.setup(user.id)

      expect(generateSecretMock).toHaveBeenCalled()
      expect(generateURIMock).toHaveBeenCalledWith({
        issuer: 'Ecommerce',
        label: user.email,
        secret: 'TOTP-SECRET',
      })
      expect(userRepository.updateTotpSecret).toHaveBeenCalledWith(user.id, 'TOTP-SECRET')
      expect(result).toEqual({
        secret: 'TOTP-SECRET',
        otpauthUri: 'otpauth://totp/Ecommerce:test@example.com',
      })
    })

    it('rejects when the user does not exist', async () => {
      userRepository.findById.mockResolvedValue(null)

      await expect(service.setup(999)).rejects.toThrow('User not found')

      expect(generateSecretMock).not.toHaveBeenCalled()
      expect(userRepository.updateTotpSecret).not.toHaveBeenCalled()
    })

    it('rejects when two-factor authentication is already enabled', async () => {
      userRepository.findById.mockResolvedValue(buildUser({ totpEnabled: true, totpSecret: 'SECRET' }))

      await expect(service.setup(1)).rejects.toThrow('Two-factor authentication is already enabled')

      expect(generateSecretMock).not.toHaveBeenCalled()
      expect(userRepository.updateTotpSecret).not.toHaveBeenCalled()
    })
  })

  describe('verifyCode', () => {
    it('returns true for a valid TOTP code', async () => {
      verifyMock.mockResolvedValue({ valid: true })

      const result = await service.verifyCode('SECRET', '123456')

      expect(verifyMock).toHaveBeenCalledWith({
        secret: 'SECRET',
        token: '123456',
      })
      expect(result).toBe(true)
    })

    it('returns false for an invalid TOTP code', async () => {
      verifyMock.mockResolvedValue({ valid: false })

      await expect(service.verifyCode('SECRET', '000000')).resolves.toBe(false)
    })
  })

  describe('enable', () => {
    const body = {
      code: '123456',
    }

    it('enables two-factor authentication and creates eight hashed recovery codes', async () => {
      const user = buildUser({ totpSecret: 'TOTP-SECRET' })
      userRepository.findById.mockResolvedValue(user)
      verifyMock.mockResolvedValue({ valid: true })

      randomBytesMock
        .mockReturnValueOnce(Buffer.from('000001000001', 'hex'))
        .mockReturnValueOnce(Buffer.from('000002000002', 'hex'))
        .mockReturnValueOnce(Buffer.from('000003000003', 'hex'))
        .mockReturnValueOnce(Buffer.from('000004000004', 'hex'))
        .mockReturnValueOnce(Buffer.from('000005000005', 'hex'))
        .mockReturnValueOnce(Buffer.from('000006000006', 'hex'))
        .mockReturnValueOnce(Buffer.from('000007000007', 'hex'))
        .mockReturnValueOnce(Buffer.from('000008000008', 'hex'))

      hashingService.hash.mockImplementation((value: string) => Promise.resolve(`hash:${value}`))

      const result = await service.enable(user.id, body)

      expect(result.message).toBe('Two-factor authentication has been enabled')
      expect(result.recoveryCodes).toHaveLength(8)
      expect(result.recoveryCodes).toEqual([
        '000001-000001',
        '000002-000002',
        '000003-000003',
        '000004-000004',
        '000005-000005',
        '000006-000006',
        '000007-000007',
        '000008-000008',
      ])
      expect(hashingService.hash).toHaveBeenCalledTimes(8)
      expect(recoveryCodeRepository.deleteAllByUserId).toHaveBeenCalledWith(user.id, tx)
      expect(recoveryCodeRepository.createMany).toHaveBeenCalledWith(
        result.recoveryCodes.map((code) => ({
          userId: user.id,
          codeHash: `hash:${code}`,
        })),
        tx,
      )
      expect(userRepository.enableTotp).toHaveBeenCalledWith(user.id, tx)
    })

    it('rejects when the user does not exist', async () => {
      userRepository.findById.mockResolvedValue(null)

      await expect(service.enable(999, body)).rejects.toThrow('User not found')

      expect(verifyMock).not.toHaveBeenCalled()
    })

    it('rejects when two-factor authentication is already enabled', async () => {
      userRepository.findById.mockResolvedValue(buildUser({ totpEnabled: true, totpSecret: 'SECRET' }))

      await expect(service.enable(1, body)).rejects.toThrow('Two-factor authentication is already enabled')
    })

    it('rejects when TOTP setup has not been completed', async () => {
      userRepository.findById.mockResolvedValue(buildUser({ totpSecret: null }))

      await expect(service.enable(1, body)).rejects.toThrow('Two-factor authentication setup is required')

      expect(verifyMock).not.toHaveBeenCalled()
    })

    it('rejects an invalid TOTP code', async () => {
      userRepository.findById.mockResolvedValue(buildUser({ totpSecret: 'SECRET' }))
      verifyMock.mockResolvedValue({ valid: false })

      await expect(service.enable(1, body)).rejects.toThrow('Invalid two-factor authentication code')

      expect(hashingService.hash).not.toHaveBeenCalled()
      expect(prismaService.$transaction).not.toHaveBeenCalled()
    })
  })

  describe('verifyRecoveryCode', () => {
    const codes = [
      {
        id: 10,
        userId: 1,
        codeHash: 'hash-1',
        usedAt: null,
        createdAt: new Date(),
      },
      {
        id: 11,
        userId: 1,
        codeHash: 'hash-2',
        usedAt: null,
        createdAt: new Date(),
      },
    ]

    it('returns the matching recovery code', async () => {
      recoveryCodeRepository.findUnusedByUserId.mockResolvedValue(codes)
      hashingService.compare.mockResolvedValueOnce(false).mockResolvedValueOnce(true)

      const result = await service.verifyRecoveryCode(1, 'ABCDEF-123456')

      expect(hashingService.compare).toHaveBeenNthCalledWith(1, 'ABCDEF-123456', 'hash-1')
      expect(hashingService.compare).toHaveBeenNthCalledWith(2, 'ABCDEF-123456', 'hash-2')
      expect(result).toEqual(codes[1])
    })

    it('returns null when no recovery code matches', async () => {
      recoveryCodeRepository.findUnusedByUserId.mockResolvedValue(codes)
      hashingService.compare.mockResolvedValue(false)

      await expect(service.verifyRecoveryCode(1, 'ABCDEF-123456')).resolves.toBeNull()
      expect(hashingService.compare).toHaveBeenCalledTimes(2)
    })
  })

  describe('disable', () => {
    const body = {
      password: 'secret123',
      code: '123456',
    }

    it('disables two-factor authentication and removes recovery codes', async () => {
      const user = buildUser({ totpEnabled: true, totpSecret: 'TOTP-SECRET' })
      userRepository.findById.mockResolvedValue(user)
      hashingService.compare.mockResolvedValue(true)
      verifyMock.mockResolvedValue({ valid: true } as Awaited<ReturnType<typeof verify>>)

      const result = await service.disable(user.id, body)

      expect(hashingService.compare).toHaveBeenCalledWith(body.password, user.password)
      expect(verifyMock).toHaveBeenCalledWith({
        secret: 'TOTP-SECRET',
        token: body.code,
      })
      expect(userRepository.disableTotp).toHaveBeenCalledWith(user.id, tx)
      expect(recoveryCodeRepository.deleteAllByUserId).toHaveBeenCalledWith(user.id, tx)
      expect(result).toEqual({
        message: 'Two-factor authentication has been disabled',
      })
    })

    it('rejects when the user does not exist', async () => {
      userRepository.findById.mockResolvedValue(null)

      await expect(service.disable(999, body)).rejects.toThrow('User not found')

      expect(hashingService.compare).not.toHaveBeenCalled()
    })

    it('rejects when two-factor authentication is already disabled', async () => {
      userRepository.findById.mockResolvedValue(buildUser({ totpEnabled: false, totpSecret: null }))

      await expect(service.disable(1, body)).rejects.toThrow('Two-factor authentication is already disabled')

      expect(hashingService.compare).not.toHaveBeenCalled()
    })

    it('rejects an incorrect password', async () => {
      userRepository.findById.mockResolvedValue(buildUser({ totpEnabled: true, totpSecret: 'SECRET' }))
      hashingService.compare.mockResolvedValue(false)

      await expect(service.disable(1, body)).rejects.toThrow('Password is incorrect')

      expect(verifyMock).not.toHaveBeenCalled()
      expect(prismaService.$transaction).not.toHaveBeenCalled()
    })

    it('rejects an invalid TOTP code', async () => {
      userRepository.findById.mockResolvedValue(buildUser({ totpEnabled: true, totpSecret: 'SECRET' }))
      hashingService.compare.mockResolvedValue(true)
      verifyMock.mockResolvedValue({ valid: false })

      await expect(service.disable(1, body)).rejects.toThrow('Invalid two-factor authentication code')

      expect(prismaService.$transaction).not.toHaveBeenCalled()
      expect(userRepository.disableTotp).not.toHaveBeenCalled()
    })
  })
})
