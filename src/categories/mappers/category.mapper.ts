import { Category as CategoryDB } from '../../generated/prisma/client.js';
import { Category } from '../entities/category.entity.js';

export class CategoryMapper {
  static toEntity(category: CategoryDB): Category {
    return {
      id: category.id,
      name: category.name.charAt(0).toUpperCase() + category.name.slice(1),
      description: category.description,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  static toEntityList(categories: CategoryDB[]): Category[] {
    return categories.map((category) => this.toEntity(category));
  }
}
