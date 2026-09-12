import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common'
import { CartService } from './cart.service'
import { ActiveUser } from '@/shared/decorators/active-user.decorator'
import { AddCartItemBodyDTO, UpdateCartItemBodyDTO } from './cart.dto'

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  findMyCart(@ActiveUser('userId') userId: number) {
    return this.cartService.findMyCart(userId)
  }

  @Post('items')
  addItem(@ActiveUser('userId') userId: number, @Body() body: AddCartItemBodyDTO) {
    return this.cartService.addItem(userId, body)
  }

  @Patch('items/:skuId')
  updateItem(
    @ActiveUser('userId') userId: number,
    @Param('skuId', ParseIntPipe) skuId: number,
    @Body() body: UpdateCartItemBodyDTO,
  ) {
    return this.cartService.updateItem(userId, skuId, body)
  }

  @Delete('items/:skuId')
  deleteItem(@ActiveUser('userId') userId: number, @Param('skuId', ParseIntPipe) skuId: number) {
    return this.cartService.deleteItem(userId, skuId)
  }

  @Delete()
  clear(@ActiveUser('userId') userId: number) {
    return this.cartService.clear(userId)
  }
}
