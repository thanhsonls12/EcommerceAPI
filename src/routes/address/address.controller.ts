import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common'
import { AddressService } from './address.service'
import { ActiveUser } from '@/shared/decorators/active-user.decorator'
import { CreateAddressBodyDTO, UpdateAddressBodyDTO } from './address.dto'

@Controller('addresses')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Post()
  create(@ActiveUser('userId') userId: number, @Body() body: CreateAddressBodyDTO) {
    return this.addressService.create(userId, body)
  }

  @Get()
  findMine(@ActiveUser('userId') userId: number) {
    return this.addressService.findMine(userId)
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser('userId') userId: number,
    @Body() body: UpdateAddressBodyDTO,
  ) {
    return this.addressService.update(id, userId, body)
  }

  @Patch(':id/default')
  setDefault(@Param('id', ParseIntPipe) id: number, @ActiveUser('userId') userId: number) {
    return this.addressService.setDefault(id, userId)
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number, @ActiveUser('userId') userId: number) {
    return this.addressService.delete(id, userId)
  }
}
