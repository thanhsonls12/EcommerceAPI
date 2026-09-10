import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { UserRepository } from './user.repository'
import { UpdateProfileBodyDto } from './user.dto'

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

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
}
