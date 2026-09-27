import { User } from '../entities/user.entity.js';
import type { UserGetPayload } from '../../generated/prisma/models.js';
import { StaffUser } from '../entities/staff-user.entity.js';

type UserDB = UserGetPayload<{ include: { store: true } }>;

export class UserMapper {
  static toEntity(user: UserDB): User {
    return {
      id: user.id,
      storeName: user.store.name,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName ?? ''}`,
      initials: this.getInitials(user.firstName, user.lastName),
      avatar: user.avatarUrl,
      email: user.email!,
      isActive: user.isActive,
      isShopOwner: user.isShopOwner,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  static toEntityList(users: UserDB[]): User[] {
    return users.map((user) => this.toEntity(user));
  }

  static toStaffUserEntity(user: UserDB): StaffUser {
    const { ...rest } = user;

    return {
      id: rest.id,
      name: `${rest.firstName} ${rest.lastName || ''}`,
      firstName: rest.firstName,
      lastName: rest.lastName,
      initials: this.getInitials(rest.firstName, rest.lastName),
      avatar: rest.avatarUrl,
      email: rest.email,
      phone: rest.phone,
      isShopOwner: rest.isShopOwner,
      isActive: rest.isActive,
      role: rest.role,
      createdAt: rest.createdAt,
    };
  }

  static toStaffUserEntityList(users: UserDB[]): StaffUser[] {
    return users.map((user) => this.toStaffUserEntity(user));
  }

  private static getInitials(
    firstName: string,
    lastName?: string | null,
  ): string[] {
    const firstInitial = firstName.charAt(0).toUpperCase();

    const lastInitial = !lastName
      ? firstName.trim().split(/\s+/).length > 1
        ? firstName.trim().split(/\s+/)[1].charAt(0).toUpperCase()
        : firstName.charAt(1).toUpperCase()
      : lastName?.charAt(0)?.toUpperCase();

    return [firstInitial, lastInitial];
  }
}
