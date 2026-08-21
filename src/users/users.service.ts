import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createUserDto: CreateUserDto, storeId: string) {
    const { firstName, lastName, email, phone, password, role } = createUserDto;

    const existUser = await this.prismaService.user.findFirst({
      where: {
        email: email,
        storeId: storeId,
      },
    });

    if (existUser) {
      throw new BadRequestException('User already exists with email: ' + email);
    }

    const user = await this.prismaService.user.create({
      data: {
        storeId: storeId,
        firstName: firstName,
        lastName: lastName,
        email: email,
        phone: phone,
        password: password,
        role: role,
        isShopOwner: false,
      },
    });

    return user;
  }

  findAll() {
    return `This action returns all users`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
