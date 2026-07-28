import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { ProductStatus } from 'src/generated/prisma/enums';

export class ProductsPaginationDto extends PaginationDto {
  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;

  @IsString()
  @IsOptional()
  category?: string;
}
