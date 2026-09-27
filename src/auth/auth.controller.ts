import { ApiTags } from '@nestjs/swagger';
import { ApiEndpoint } from '../common/openapi/api-endpoint.decorator.js';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterUserDto } from './dto/register-user.dto.js';
import { LoginUserDto } from './dto/login-user.dto.js';
import { GetUser } from './decorators/get-user.decorator.js';
import { Auth } from './decorators/auth.decorator.js';

import type { UserGetPayload } from '../generated/prisma/models.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiEndpoint(
    'Iniciar sesión',
    'Público. Valida correo y contraseña. Usuario inexistente, contraseña incorrecta o cuenta inactiva producen 400. Devuelve JWT de 24 horas y perfil. No requiere autenticación.',
    'AuthSession',
    201,
    [],
    [],
  )
  login(@Body() loginUserDto: LoginUserDto) {
    return this.authService.login(loginUserDto);
  }

  @Post('register')
  @ApiEndpoint(
    'Registrar tienda y propietario',
    'Público. Crea transaccionalmente tienda, configuración, ubicación predeterminada y usuario OWNER. Correo existente produce 400. Devuelve JWT y perfil. No requiere autenticación.',
    'AuthSession',
    201,
    [],
    [],
  )
  register(@Body() registerUserDto: RegisterUserDto) {
    return this.authService.register(registerUserDto);
  }

  @Get('check-status')
  @Auth()
  @ApiEndpoint(
    'Validar sesión y renovar token',
    'Requiere usuario activo. Devuelve el perfil y un nuevo JWT de 24 horas. Roles permitidos: OWNER, MANAGER, CASHIER.',
    'AuthSession',
    200,
    [],
    [],
  )
  checkAuthStatus(
    @GetUser() user: UserGetPayload<{ include: { store: true } }>,
  ) {
    return this.authService.checkAuthStatus(user);
  }
}
