import {
  BadRequestException,
  ConflictException,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';

export class DBExceptionHelper {
  private static readonly logger = new Logger(DBExceptionHelper.name);

  static handle(error: unknown): never {
    console.log({ error });

    if (error instanceof HttpException) {
      throw error;
    }
    // 1. Errores conocidos del cliente (Ej: Restricciones de BD, duplicados)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002': // Unique constraint failed
          // A veces target viene, a veces no (depende de la versión/adaptador)mm
          const target = error.meta?.target as string[] | undefined;
          const fields = target ? target.join(', ') : 'desconocido';
          throw new ConflictException(
            `Conflicto de unicidad: El valor para el campo [${fields}] ya existe.`,
          );

        case 'P2025': // Record not found
          throw new NotFoundException(
            'Operación fallida: El registro requerido no fue encontrado.',
          );

        case 'P2003': // Foreign key constraint failed
          throw new BadRequestException(
            'No se puede eliminar o actualizar este registro porque está relacionado con otros datos.',
          );

        default:
          this.logger.error(
            `Prisma Error ${error.code}: ${error.message}`,
            error.stack,
          );
          throw new InternalServerErrorException(
            `Error inesperado en la base de datos (Código: ${error.code}).`,
          );
      }
    }

    // 2. Errores de validación de tipos antes de enviar la consulta
    if (error instanceof Prisma.PrismaClientValidationError) {
      this.logger.error(
        `Prisma Validation Error: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        'Los datos enviados no son válidos para la base de datos.',
      );
    }

    // 3. Errores de inicialización de la conexión
    if (error instanceof Prisma.PrismaClientInitializationError) {
      this.logger.fatal(`DB Connection Error: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        'No se pudo conectar a la base de datos. Intente más tarde.',
      );
    }

    // 4. Fallos desconocidos o crashes del motor (Rust Panic)
    if (
      error instanceof Prisma.PrismaClientUnknownRequestError ||
      error instanceof Prisma.PrismaClientRustPanicError
    ) {
      this.logger.error(
        'Ocurrió un fallo crítico en el motor de Prisma.',
        error.stack,
      );
      throw new InternalServerErrorException(
        'Ocurrió un error inesperado en el motor de base de datos.',
      );
    }

    // 5. Errores nativos de JavaScript u otros no clasificados
    this.logger.error('Unhandled exception in DB operation', error);
    // Lanzamos el error original, NestJS lo atrapará y devolverá un 500
    throw error;
  }
}
