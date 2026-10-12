import { Body, Controller, Get, Header, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginUserDto } from './dto/login-user.dto.js';
import { LoginPinDto } from './dto/login-pin.dto.js';
import { Auth } from './decorators/auth.decorator.js';
import { GetUser } from './decorators/get-user.decorator.js';

import type { User } from '../generated/prisma/client.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() loginUserDto: LoginUserDto) {
    return this.authService.login(loginUserDto);
  }

  @Post('login-pin')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  loginPin(@Body() loginPinDto: LoginPinDto) {
    return this.authService.loginPin(loginPinDto);
  }

  @Auth()
  @Get('check-status')
  checkAuthStatus(@GetUser() user: User) {
    return this.authService.checkAuthStatus(user);
  }
}
