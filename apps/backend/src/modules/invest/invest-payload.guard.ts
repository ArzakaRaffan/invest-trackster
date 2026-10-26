import { BadRequestException, CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

/** Runs before the legacy global pipe strips unknown properties. Scoped to Invest only. */
@Injectable()
export class InvestPayloadGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const types: Function[] = Reflect.getMetadata('design:paramtypes', context.getClass().prototype, context.getHandler().name) ?? [];
    const dto = types.find(t => t?.name.startsWith('Invest') && t.name.endsWith('Dto'));
    if (!dto) return true;
    const body = context.switchToHttp().getRequest().body;
    if (body == null || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => ['__proto__', 'constructor', 'prototype'].includes(k))) throw new BadRequestException('Isian harus berupa objek sesuai kontrak Invest');
    const instance = plainToInstance(dto as new () => object, body);
    const errors = validateSync(instance, { whitelist: true, forbidNonWhitelisted: true, forbidUnknownValues: true, validationError: { target: false, value: false } });
    if (errors.length) throw new BadRequestException(errors.slice(0, 12).map(e => `Isian ${e.property} tidak valid atau tidak diizinkan`));
    return true;
  }
}
