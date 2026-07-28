import { IsString, IsEmail, MinLength, IsOptional } from 'class-validator';

export class RegisterUserDto {
  @IsString()
  @MinLength(3)
  storeName: string;

  @IsString()
  @MinLength(3)
  firstName: string;

  @IsString()
  @MinLength(3)
  @IsOptional()
  lastName?: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}
