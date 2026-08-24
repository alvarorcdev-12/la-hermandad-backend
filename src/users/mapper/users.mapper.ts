import { UserResponseDto } from '../dto/user-response.dto';

import type { UserGetPayload } from 'src/generated/prisma/models';

type UserDB = UserGetPayload<{ include: { store: true } }>;

export class UsersMapper {
  static toUserResponseDto(user: UserDB): UserResponseDto {
    return {
      id: user.id,
      storeName: user.store.name,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName ?? ''}`,
      initials: [user.firstName.charAt(0), user.lastName?.charAt(0) ?? ''],
      avatar: user.avatarUrl,
      email: user.email!,
      isActive: user.isActive,
      isShopOwner: user.isShopOwner,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  static toUserResponseDtoList(users: UserDB[]): UserResponseDto[] {
    return users.map((user) => this.toUserResponseDto(user));
  }
}
