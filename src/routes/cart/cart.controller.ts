import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common'
import { CartService } from './cart.service'
import { ActiveUser } from '@/shared/decorators/active-user.decorator'
import { AddCartItemBodyDTO, UpdateCartItemBodyDTO } from './cart.dto'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

@ApiTags('Cart')
@ApiBearerAuth('access-token')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @ApiOperation({ summary: 'Get current user cart' })
  @Get()
  findMyCart(@ActiveUser('userId') userId: number) {
    return this.cartService.findMyCart(userId)
  }

  @ApiOperation({ summary: 'Add item to cart' })
  @Post('items')
  addItem(@ActiveUser('userId') userId: number, @Body() body: AddCartItemBodyDTO) {
    return this.cartService.addItem(userId, body)
  }

  @ApiOperation({ summary: 'Update cart item quantity' })
  @Patch('items/:skuId')
  updateItem(
    @ActiveUser('userId') userId: number,
    @Param('skuId', ParseIntPipe) skuId: number,
    @Body() body: UpdateCartItemBodyDTO,
  ) {
    return this.cartService.updateItem(userId, skuId, body)
  }

  @ApiOperation({ summary: 'Remove item from cart' })
  @Delete('items/:skuId')
  deleteItem(@ActiveUser('userId') userId: number, @Param('skuId', ParseIntPipe) skuId: number) {
    return this.cartService.deleteItem(userId, skuId)
  }

  @ApiOperation({ summary: 'Clear current user cart' })
  @Delete()
  clear(@ActiveUser('userId') userId: number) {
    return this.cartService.clear(userId)
  }
}
