import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginUserDto } from './dto/login-user.dto.js';
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

  @Auth()
  @Get('check-status')
  checkAuthStatus(@GetUser() user: User) {
    return this.authService.checkAuthStatus(user);
  }
}
