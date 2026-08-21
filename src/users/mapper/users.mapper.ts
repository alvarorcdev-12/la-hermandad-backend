import { User } from 'src/generated/prisma/client';
import { UserResponseDto } from '../dto/user-response.dto';

export class UsersMapper {
  static toUserResponseDto(user: User): UserResponseDto {
    return {
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName ?? ''}`,
      initials: [user.firstName.charAt(0), user.lastName?.charAt(0) ?? ''],
      email: user.email!,
      role: user.role,
      isShopOwner: user.isShopOwner,
      phone: user.phone,
      avatar: user.avatarUrl,
    };
  }

  static toUserResponseDtoList(users: User[]): UserResponseDto[] {
    return users.map((user) => this.toUserResponseDto(user));
  }
}
