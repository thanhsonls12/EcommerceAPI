import { Injectable, NotFoundException } from '@nestjs/common'
import { AddressRepository } from './address.repository'
import { CreateAddressBodyDTO, UpdateAddressBodyDTO } from './address.dto'
import { MESSAGE } from '@/shared/constants/message.constant'

@Injectable()
export class AddressService {
  constructor(private readonly addressRepository: AddressRepository) {}

  create(userId: number, body: CreateAddressBodyDTO) {
    return this.addressRepository.transaction(async (tx) => {
      const activeCount = await this.addressRepository.countActiveByUserId(tx, userId)

      const shouldBeDefault = activeCount === 0 || body.isDefault === true

      if (shouldBeDefault) {
        await this.addressRepository.unsetDefault(tx, userId)
      }

      return this.addressRepository.create(tx, {
        userId,
        name: body.name,
        phoneNumber: body.phoneNumber,
        address: body.address,
        note: body.note,
        isDefault: shouldBeDefault,
      })
    })
  }

  findMine(userId: number) {
    return this.addressRepository.findManyByUserId(userId)
  }

  async update(id: number, userId: number, body: UpdateAddressBodyDTO) {
    return this.addressRepository.transaction(async (tx) => {
      const address = await this.addressRepository.findByIdAndUserId(id, userId, tx)

      if (!address) {
        throw new NotFoundException(MESSAGE.ADDRESS.NOT_FOUND)
      }

      if (body.isDefault === true) {
        await this.addressRepository.unsetDefault(tx, userId)
      }

      await this.addressRepository.update(tx, id, userId, {
        ...(body.name !== undefined && {
          name: body.name,
        }),
        ...(body.phoneNumber !== undefined && {
          phoneNumber: body.phoneNumber,
        }),
        ...(body.address !== undefined && {
          address: body.address,
        }),
        ...(body.note !== undefined && {
          note: body.note,
        }),
        ...(body.isDefault === true && {
          isDefault: true,
        }),
      })

      return this.addressRepository.findByIdAndUserId(id, userId, tx)
    })
  }

  async setDefault(id: number, userId: number) {
    return this.addressRepository.transaction(async (tx) => {
      const address = await this.addressRepository.findByIdAndUserId(id, userId, tx)

      if (!address) {
        throw new NotFoundException(MESSAGE.ADDRESS.NOT_FOUND)
      }

      await this.addressRepository.unsetDefault(tx, userId)

      await this.addressRepository.setDefault(tx, id, userId)

      return this.addressRepository.findByIdAndUserId(id, userId, tx)
    })
  }

  async delete(id: number, userId: number) {
    return this.addressRepository.transaction(async (tx) => {
      const address = await this.addressRepository.findByIdAndUserId(id, userId, tx)

      if (!address) {
        throw new NotFoundException(MESSAGE.ADDRESS.NOT_FOUND)
      }

      await this.addressRepository.softDelete(tx, id, userId)

      if (address.isDefault) {
        const replacement = await this.addressRepository.findNewestActive(tx, userId)

        if (replacement) {
          await this.addressRepository.setDefault(tx, replacement.id, userId)
        }
      }

      return {
        message: MESSAGE.ADDRESS.DELETED_SUCCESSFULLY,
      }
    })
  }
}
