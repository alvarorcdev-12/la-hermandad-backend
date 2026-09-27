import { SetMetadata } from '@nestjs/common';
import { Role } from '../../generated/prisma/enums.js';
// import { ValidRoles } from '../interfaces/index.js';

export const META_ROLES = 'roles';

export const RoleProtected = (...args: Role[]) => {
  return SetMetadata(META_ROLES, args);
};
