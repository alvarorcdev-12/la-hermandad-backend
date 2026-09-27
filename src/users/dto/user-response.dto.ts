import { Role } from '../../generated/prisma/enums.js';

export class UserResponseDto {
  id: string;
  storeName: string;
  firstName: string;
  lastName: string | null;
  avatar: string | null;
  email: string;
  initials: string[];
  isActive: boolean;
  isShopOwner: boolean;
  name: string;
  phone: string | null;
  role: Role;
  createdAt: Date;
}
