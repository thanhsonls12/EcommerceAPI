import { Body, Controller, Post } from '@nestjs/common'
import { AuthService } from './auth.service'
import { RegisterBodyDTO, RegisterResDTO } from './auth.dto'
import { ZodSerializerDto } from 'nestjs-zod'
import { Public } from '@/shared/decorators/public.decorator'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Public()
  @Post('register')
  @ZodSerializerDto(RegisterResDTO)
  register(@Body() body: RegisterBodyDTO) {
    return this.authService.register(body)
  }

  // TODO: hàm đang rỗng, khi viết thật sẽ đổi flow (logout cần auth)
  @Public()
  @Post('login')
  login(@Body() body: any) {
    return this.authService.login(body)
  }

  @Public()
  @Post('refresh-token')
  refreshToken() {
    return this.authService.refreshToken()
  }

  @Public()
  @Post('logout')
  logout() {
    return this.authService.logout()
  }
}
