import { Injectable } from '@nestjs/common'
import { RolesService } from './roles.service'
import { HashingService } from '@/shared/services/hashing.service'
import { PrismaService } from '@/shared/services/prisma.service'

import { RegisterBodyDTO } from './auth.dto'

@Injectable()
export class AuthService {
  constructor(
    private readonly rolesService: RolesService,
    private readonly hashingService: HashingService,
    private readonly prismaService: PrismaService,
  ) {}
  async register(body: RegisterBodyDTO) {
    const clientRoleId = await this.rolesService.getClientRoleId()
    const hashedPassword = await this.hashingService.hash(body.password)
    const user = await this.prismaService.user.create({
      data: {
        email: body.email,
        password: hashedPassword,
        name: body.name,
        phoneNumber: body.phoneNumber,
        roleId: clientRoleId,
      },
      omit: {
        password: true,
        totpSecret: true,
      },
    })
    return user
  }

  login(body: any) {}

  refreshToken() {}

  logout() {}
}
