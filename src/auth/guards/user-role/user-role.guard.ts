import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

import { META_ROLES } from '../../decorators/role-protected.decorator.js';

@Injectable()
export class UserRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const validRoles = this.reflector.getAllAndOverride<string[]>(META_ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!validRoles || validRoles.length === 0) return true;

    const req = context.switchToHttp().getRequest();

    const user = req.user;

    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    if (validRoles.includes(user.role)) {
      return true;
    }

    throw new ForbiddenException(
      `El usuario ${user.fullName} necesita uno de estos roles: ${validRoles.join(', ')}`,
    );
  }
}
