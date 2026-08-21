import { User } from 'src/generated/prisma/client';
import { UserResponseDto } from '../dto/user-response.dto';

export class UsersMapper {
  static toUserResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
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

  static toUserResponseDtoList(users: User[]): UserResponseDto[] {
    return users.map((user) => this.toUserResponseDto(user));
  }
}
