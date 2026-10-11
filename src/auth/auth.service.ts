import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service.js';
import { JwtPayload } from './interfaces/jwt-payload.interface.js';
import { JwtService } from '@nestjs/jwt';
import { LoginUserDto } from './dto/login-user.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;

    const user = await this.prismaService.user.findUnique({
      where: { email: email },
      include: {
        store: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas (email).');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password!);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas (password).');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    return {
      token: this.getJWTToken({ id: user.id }),
      // TODO: mapper a la nueva entidad
      user,
      // user: UserMapper.toEntity(user),
    };
  }

  private getJWTToken(payload: JwtPayload) {
    return this.jwtService.sign(payload);
  }
}
