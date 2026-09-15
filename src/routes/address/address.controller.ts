import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common'
import { AddressService } from './address.service'
import { ActiveUser } from '@/shared/decorators/active-user.decorator'
import { CreateAddressBodyDTO, UpdateAddressBodyDTO } from './address.dto'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

@ApiTags('Addresses')
@ApiBearerAuth('access-token')
@Controller('addresses')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @ApiOperation({ summary: 'Create address' })
  @Post()
  create(@ActiveUser('userId') userId: number, @Body() body: CreateAddressBodyDTO) {
    return this.addressService.create(userId, body)
  }

  @ApiOperation({ summary: 'Get current user addresses' })
  @Get()
  findMine(@ActiveUser('userId') userId: number) {
    return this.addressService.findMine(userId)
  }

  @ApiOperation({ summary: 'Update address' })
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @ActiveUser('userId') userId: number,
    @Body() body: UpdateAddressBodyDTO,
  ) {
    return this.addressService.update(id, userId, body)
  }

  @ApiOperation({ summary: 'Set address as default' })
  @Patch(':id/default')
  setDefault(@Param('id', ParseIntPipe) id: number, @ActiveUser('userId') userId: number) {
    return this.addressService.setDefault(id, userId)
  }

  @ApiOperation({ summary: 'Delete address' })
  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number, @ActiveUser('userId') userId: number) {
    return this.addressService.delete(id, userId)
  }
}
