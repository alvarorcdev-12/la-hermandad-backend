import { Role } from 'src/generated/prisma/enums';

export class UserResponseDto {
  firstName: string;

  lastName: string | null;

  name: string;

  initials: string[];

  email: string;

  role: Role;

  isShopOwner: boolean;

  phone: string | null;

  avatar: string | null;
}
