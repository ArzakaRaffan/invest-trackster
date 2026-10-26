import { Type } from 'class-transformer';
import { Equals, IsBoolean, IsDefined, IsIn, IsInt, IsISO8601, IsObject, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { RiskAnswers } from './invest-profile';

const amount = /^(0|[1-9]\d{0,15})(\.\d{1,2})?$/;
const precise = /^(0|[1-9]\d{0,15})(\.\d{1,12})?$/;
const id = /^[a-zA-Z0-9-]{1,80}$/;

export class InvestWriteDto {
  @Matches(/^[a-f0-9]{64}$/) expectedRevision: string;
  @Matches(/^[a-zA-Z0-9_-]{8,80}$/) idempotencyKey: string;
}

export class InvestGoalDto extends InvestWriteDto {
  @IsString() @Matches(/\S/) @MaxLength(100) name: string;
  @IsOptional() @Matches(amount) targetAmountIDR?: string | null;
  @IsOptional() @Matches(/^20\d{2}-\d{2}-\d{2}$/) needDate?: string | null;
  @IsOptional() @IsInt() @Min(0) @Max(36500) liquidityDays?: number | null;
  @IsIn(['ACTIVE', 'DRAFT']) status: 'ACTIVE' | 'DRAFT';
  @IsIn(['UNKNOWN', 'EMPTY', 'ENTERED']) holdingsDeclaration: 'UNKNOWN' | 'EMPTY' | 'ENTERED';
  @IsOptional() @IsInt() @Min(1) expectedVersion?: number;
}

export class InvestRiskAnswersDto implements RiskAnswers {
  @IsOptional() @IsInt() @Min(0) @Max(3) t1?: number;
  @IsOptional() @IsInt() @Min(0) @Max(3) t2?: number;
  @IsOptional() @IsInt() @Min(0) @Max(3) t3?: number;
  @IsOptional() @IsInt() @Min(0) @Max(3) t4?: number;
  @IsOptional() @Matches(amount) essentialExpenseIDR?: string;
  @IsOptional() @Matches(amount) liquidReserveIDR?: string;
  @IsOptional() @Matches(amount) lossCapacityIDR?: string;
  @IsOptional() @IsBoolean() incomeStable?: boolean;
  @IsOptional() @IsBoolean() urgentObligations?: boolean;
  @IsOptional() @IsBoolean() nearTermNeed?: boolean;
  @IsOptional() @IsBoolean() hasDeficit?: boolean;
  @IsOptional() @IsBoolean() expensiveDebt?: boolean;
  @IsOptional() @IsIn(['TRUE', 'FALSE', 'UNSURE']) k1?: 'TRUE' | 'FALSE' | 'UNSURE';
  @IsOptional() @IsIn(['TRUE', 'FALSE', 'UNSURE']) k2?: 'TRUE' | 'FALSE' | 'UNSURE';
  @IsOptional() @IsIn(['TRUE', 'FALSE', 'UNSURE']) k3?: 'TRUE' | 'FALSE' | 'UNSURE';
  @IsOptional() @IsBoolean() cryptoOptIn?: boolean;
  @IsOptional() @Matches(/^(?:[0-4](?:\.\d{1,2})?|5(?:\.0{1,2})?)$/) cryptoPercent?: string;
}

export class InvestProfileDto extends InvestWriteDto {
  @IsInt() @Min(0) expectedVersion: number;
  @IsDefined() @IsObject() @ValidateNested() @Type(() => InvestRiskAnswersDto) answers: InvestRiskAnswersDto;
  @IsBoolean() confirmed: boolean;
  @IsBoolean() conflictsAcknowledged: boolean;
  @IsOptional() @Matches(/^[a-f0-9]{64}$/) reviewHash?: string;
}

export class InvestHoldingDto extends InvestWriteDto {
  @Matches(id) goalId: string;
  @IsString() @Matches(/\S/) @MaxLength(100) label: string;
  @IsIn(['CASH', 'BONDS', 'EQUITY', 'CRYPTO']) assetClass: 'CASH' | 'BONDS' | 'EQUITY' | 'CRYPTO';
  @Matches(/^[A-Z]{3}$/) currency: string;
  @IsIn(['UNITS', 'VALUE']) mode: 'UNITS' | 'VALUE';
  @IsOptional() @Matches(precise) quantity?: string;
  @IsOptional() @Matches(precise) unitPrice?: string;
  @IsOptional() @Matches(amount) value?: string;
  @IsOptional() @Matches(amount) costBasisIDR?: string;
  @IsISO8601({ strict: true }) openingAt: string;
  @IsISO8601({ strict: true }) valuationAt: string;
  @IsOptional() @Matches(precise) fxToIDR?: string;
  @IsOptional() @IsISO8601({ strict: true }) fxAsOf?: string;
  @IsString() @Matches(/\S/) @MaxLength(300) valuationNote: string;
}

export class InvestHoldingUpdateDto extends InvestWriteDto {
  @IsInt() @Min(1) expectedVersion: number;
  @IsIn(['UNITS', 'VALUE']) mode: 'UNITS' | 'VALUE';
  @IsOptional() @Matches(precise) quantity?: string;
  @IsOptional() @Matches(precise) unitPrice?: string;
  @IsOptional() @Matches(amount) value?: string;
  @IsISO8601({ strict: true }) valuationAt: string;
  @IsOptional() @Matches(precise) fxToIDR?: string;
  @IsOptional() @IsISO8601({ strict: true }) fxAsOf?: string;
  @IsString() @Matches(/\S/) @MaxLength(300) valuationNote: string;
}

export class InvestMovementDto {
  @Matches(id) goalId: string;
  @IsOptional() @Matches(id) holdingId?: string;
  @IsIn(['PURCHASE', 'SALE', 'DISTRIBUTION', 'GOAL_SAVING']) type: 'PURCHASE' | 'SALE' | 'DISTRIBUTION' | 'GOAL_SAVING';
  @Matches(/^20\d{2}-(0[1-9]|1[0-2])$/) allocationMonth: string;
  @IsOptional() @IsISO8601({ strict: true }) occurredAt?: string;
  @Matches(amount) principalIDR: string;
  @Matches(amount) feeIDR: string;
  @IsOptional() @Matches(precise) quantity?: string;
  @IsOptional() @Matches(id) fundingEntryId?: string;
  @IsOptional() @IsInt() @Min(1) receiptTransactionId?: number;
  @IsOptional() @IsInt() @Min(1) receiptIncomeId?: number;
  @Equals(true) occurredConfirmed: boolean;
  @IsBoolean() outsideCapAcknowledged: boolean;
  @IsString() @Matches(/\S/) @MaxLength(300) reason: string;
}

export class InvestLedgerDto extends InvestWriteDto {
  @IsDefined() @IsObject() @ValidateNested() @Type(() => InvestMovementDto) movement: InvestMovementDto;
}
export class InvestCorrectionDto extends InvestWriteDto {
  @IsString() @Matches(/\S/) @MaxLength(300) reason: string;
  @IsOptional() @IsObject() @ValidateNested() @Type(() => InvestMovementDto) replacement?: InvestMovementDto;
}
export class InvestPortfolioQuery {
  @IsOptional() @Matches(id) goalId?: string;
  @IsOptional() @Matches(id) cursor?: string;
}
