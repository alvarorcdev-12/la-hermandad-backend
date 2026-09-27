import { Role } from 'src/generated/prisma/enums';

export class User {
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
