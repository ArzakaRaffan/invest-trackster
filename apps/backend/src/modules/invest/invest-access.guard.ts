import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

export function hasInvestAccess(userId: number, enabled = process.env.INVEST_ENABLED, ids = process.env.INVEST_USER_IDS): boolean {
  return enabled === 'true' && Number.isSafeInteger(userId) && userId > 0 &&
    (ids ?? '').split(',').some(id => /^[1-9]\d*$/.test(id.trim()) && Number(id.trim()) === userId);
}

@Injectable()
export class InvestAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (!hasInvestAccess(context.switchToHttp().getRequest().user?.sub)) {
      throw new ForbiddenException('Akses Invest belum diaktifkan untuk akun ini');
    }
    return true;
  }
}
