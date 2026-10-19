import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiConsumes,
  ApiProduces,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { ApiErrors } from '../common/openapi/api-response.decorator.js';
import { User as UserResponse } from '../users/entities/user.entity.js';
import { StaffUser } from '../users/entities/staff-user.entity.js';

import { Body, Controller, Get, Header, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginUserDto } from './dto/login-user.dto.js';
import { LoginPinDto } from './dto/login-pin.dto.js';
import { Auth } from './decorators/auth.decorator.js';
import { GetUser } from './decorators/get-user.decorator.js';

import type { User } from '../generated/prisma/client.js';

@ApiTags('Autenticación')
@ApiProduces('application/json')
@ApiErrors({ 500: 'Error interno o fallo de acceso a los datos.' })
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: 'Iniciar sesión con correo y contraseña',
    description:
      'Autenticación por correo y contraseña. Devuelve un JWT con vigencia de 24 horas y el usuario. La cuenta debe estar activa. El código actual es 201.',
    operationId: 'auth_login',
  })
  @ApiConsumes('application/json')
  @ApiBody({ type: LoginUserDto, required: true })
  @ApiErrors({
    '400':
      'Parámetros o cuerpo inválidos, propiedades no permitidas o regla de negocio incumplida.',
    '401': 'Credenciales inválidas o cuenta no habilitada para este acceso.',
  })
  @ApiExtraModels(UserResponse)
  @ApiResponse({
    status: 201,
    description: 'Operación completada.',
    schema: {
      type: 'object',
      required: ['token', 'user'],
      properties: {
        token: {
          type: 'string',
          description: 'JWT de acceso con vigencia de 24 horas; dato sensible.',
        },
        user: { $ref: getSchemaPath(UserResponse) },
      },
    },
  })
  @Post('login')
  login(@Body() loginUserDto: LoginUserDto) {
    return this.authService.login(loginUserDto);
  }

  @ApiOperation({
    summary: 'Iniciar sesión POS con PIN',
    description:
      'Solo permite cuentas CASHIER activas de la tienda indicada. El PIN conserva los ceros iniciales. Devuelve JWT de 24 horas y usuario, con Cache-Control: no-store.',
    operationId: 'auth_loginPin',
  })
  @ApiConsumes('application/json')
  @ApiBody({ type: LoginPinDto, required: true })
  @ApiErrors({
    '400':
      'Parámetros o cuerpo inválidos, propiedades no permitidas o regla de negocio incumplida.',
    '401': 'Credenciales inválidas o cuenta no habilitada para este acceso.',
  })
  @ApiExtraModels(StaffUser)
  @ApiResponse({
    status: 200,
    description: 'Operación completada.',
    schema: {
      type: 'object',
      required: ['token', 'user'],
      properties: {
        token: {
          type: 'string',
          description: 'JWT de acceso con vigencia de 24 horas; dato sensible.',
        },
        user: { $ref: getSchemaPath(StaffUser) },
      },
    },
    headers: {
      'Cache-Control': {
        description: 'Impide almacenar la respuesta sensible.',
        schema: { type: 'string', enum: ['no-store'] },
      },
    },
  })
  @Post('login-pin')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  loginPin(@Body() loginPinDto: LoginPinDto) {
    return this.authService.loginPin(loginPinDto);
  }

  @Auth()
  @ApiOperation({
    summary: 'Comprobar sesión y renovar JWT',
    description:
      'Valida el JWT y emite otro de 24 horas usando el estado actual del usuario. Autenticación Bearer JWT. Roles: OWNER, MANAGER, CASHIER.',
    operationId: 'auth_checkAuthStatus',
  })
  @ApiExtraModels(UserResponse)
  @ApiResponse({
    status: 200,
    description: 'Operación completada.',
    schema: {
      type: 'object',
      required: ['token', 'user'],
      properties: {
        token: {
          type: 'string',
          description: 'JWT de acceso con vigencia de 24 horas; dato sensible.',
        },
        user: { $ref: getSchemaPath(UserResponse) },
      },
    },
  })
  @Get('check-status')
  checkAuthStatus(@GetUser() user: User) {
    return this.authService.checkAuthStatus(user);
  }
}
