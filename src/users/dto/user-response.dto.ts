import { Role } from 'src/generated/prisma/enums';

export class UserResponseDto {
  id: string;

  storeName: string;

  firstName: string;

  lastName: string | null;

  name: string;

  initials: string[];

  email: string;

  role: Role;

  phone: string | null;

  isShopOwner: boolean;

  isActive: boolean;

  createdAt: Date;

  avatar: string | null;
}
