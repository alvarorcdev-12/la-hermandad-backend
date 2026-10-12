import { Role } from '../../generated/prisma/enums.js';

export class StaffUser {
  id: string;
  name: string;
  firstName: string;
  lastName: string | null;
  initials: string[];
  avatar: string | null;
  email: string | null;
  phone: string | null;
  isShopOwner: boolean;
  isActive: boolean;
  role: Role;
  createdAt: Date;
}
