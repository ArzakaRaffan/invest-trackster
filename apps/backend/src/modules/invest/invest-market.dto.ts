import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, Equals, IsArray, IsBoolean, IsDefined, IsIn, IsInt, IsISO8601, IsObject, IsOptional, IsString, IsUrl, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { InvestWriteDto } from './invest-portfolio.dto';

const amount = /^(0|[1-9]\d{0,15})(\.\d{1,2})?$/;
const precise = /^(0|[1-9]\d{0,15})(\.\d{1,12})?$/;
const rate = /^(0(?:\.\d{1,12})?|1(?:\.0{1,12})?)$/;
const id = /^[a-zA-Z0-9_-]{1,80}$/;
export type Asset = 'CASH' | 'BONDS' | 'EQUITY' | 'CRYPTO';

export class InvestSourceDto {
  @IsUrl({ protocols: ['https'], require_protocol: true }) @MaxLength(1000) url: string;
  @IsString() @Matches(/\S/) @MaxLength(160) title: string;
  @IsString() @Matches(/\S/) @MaxLength(500) section: string;
  @IsISO8601({ strict: true }) observedAt: string;
  @IsISO8601({ strict: true }) fetchedAt: string;
  @IsIn(['UNKNOWN', 'RESEARCH', 'PERMITTED']) rights: 'UNKNOWN' | 'RESEARCH' | 'PERMITTED';
  @IsString() @MaxLength(1000) rightsEvidence: string;
  @IsBoolean() store: boolean;
  @IsBoolean() display: boolean;
  @IsBoolean() analyze: boolean;
}
export class InvestFeesDto {
  @Matches(rate) buyRate: string;
  @Matches(amount) buyFixedIDR: string;
  @Matches(rate) exitRate: string;
  @Matches(amount) exitFixedIDR: string;
  @Matches(rate) ongoingAnnual: string;
  @Matches(rate) custodyAnnual: string;
  @Matches(rate) fxBuyRate: string;
  @Matches(rate) fxRoundTripRate: string;
  @IsString() @Matches(/\S/) @MaxLength(500) evidence: string;
}
export class InvestQuoteDto {
  @Matches(precise) price: string;
  @Matches(precise) fxToIDR: string;
  @IsISO8601({ strict: true }) asOf: string;
  @IsISO8601({ strict: true }) fetchedAt: string;
  @IsOptional() @IsISO8601({ strict: true }) fxAsOf?: string;
  @IsBoolean() indicative: boolean;
  @IsOptional() @IsISO8601({ strict: true }) calendarFrom?: string;
  @IsOptional() @IsISO8601({ strict: true }) calendarThrough?: string;
  @IsArray() @ArrayMaxSize(400) @ArrayUnique() @IsISO8601({ strict: true }, { each: true }) sessionCloses: string[];
  @IsString() @Matches(/\S/) @MaxLength(500) evidence: string;
}
export class InvestHistoryDto {
  @IsArray() @ArrayMaxSize(36) @ArrayUnique() @Matches(/^20\d{2}-(0[1-9]|1[0-2])$/, { each: true }) months: string[];
  @IsInt() @Min(1) @Max(2000) expectedSessions: number;
  @IsInt() @Min(0) @Max(2000) observedSessions: number;
  @IsString() @Matches(/\S/) @MaxLength(500) convention: string;
  @IsBoolean() adjustedReconciled: boolean;
  @IsBoolean() identityCalendarVerified: boolean;
  @IsOptional() @Matches(precise) secondPrice?: string;
  @IsOptional() @IsISO8601({ strict: true }) secondAsOf?: string;
  @IsOptional() @IsUrl({ protocols: ['https'], require_protocol: true }) secondSource?: string;
  @IsString() @Matches(/\S/) @MaxLength(500) evidence: string;
}
export class InvestFactsDto {
  @IsString() @Matches(/\S/) @MaxLength(120) name: string;
  @IsString() @Matches(/\S/) @MaxLength(120) issuer: string;
  @IsIn(['CONTRACTUAL', 'FUND', 'ETF', 'STOCK', 'CRYPTO']) kind: 'CONTRACTUAL' | 'FUND' | 'ETF' | 'STOCK' | 'CRYPTO';
  @IsIn(['CASH', 'BONDS', 'EQUITY', 'CRYPTO']) assetClass: Asset;
  @IsIn(['INDONESIA', 'GLOBAL', 'CRYPTO']) region: 'INDONESIA' | 'GLOBAL' | 'CRYPTO';
  @Matches(/^[A-Z]{3}$/) currency: string;
  @IsString() @Matches(/\S/) @MaxLength(100) exposure: string;
  @IsIn(['SHORT', 'MEDIUM', 'LONG']) tenorBand: 'SHORT' | 'MEDIUM' | 'LONG';
  @IsString() @Matches(/\S/) @MaxLength(120) channel: string;
  @IsIn(['UNKNOWN', 'OPEN', 'CLOSED', 'ENDED']) lifecycle: string;
  @IsOptional() @IsISO8601({ strict: true }) purchaseUntil?: string;
  @IsISO8601({ strict: true }) reviewedAt: string;
  @IsOptional() @IsISO8601({ strict: true }) validUntil?: string;
  @IsBoolean() reviewed: boolean;
  @IsBoolean() identityVerified: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(3) minimumRiskClass?: number;
  @IsOptional() @IsInt() @Min(0) @Max(36500) payoutDays?: number;
  @IsOptional() @Matches(/^20\d{2}-\d{2}-\d{2}$/) maturityDate?: string;
  @IsBoolean() locked: boolean;
  @IsBoolean() contractVerified: boolean;
  @IsBoolean() exitVerified: boolean;
  @IsOptional() @Matches(amount) minimumIDR?: string;
  @IsOptional() @Matches(precise) unitStep?: string;
  @IsIn([25, 50, 75, 100]) diversification: number;
  @IsBoolean() diversificationVerified: boolean;
  @IsOptional() @IsArray() @ArrayMinSize(3) @ArrayMaxSize(3) @Matches(rate, { each: true }) stressLosses?: string[];
  @IsString() @MaxLength(500) stressEvidence: string;
  @IsString() @MaxLength(1000) note: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(12) @ValidateNested({ each: true }) @Type(() => InvestSourceDto) sources: InvestSourceDto[];
  @IsOptional() @IsObject() @ValidateNested() @Type(() => InvestFeesDto) fees?: InvestFeesDto;
  @IsOptional() @IsObject() @ValidateNested() @Type(() => InvestQuoteDto) quote?: InvestQuoteDto;
  @IsOptional() @IsObject() @ValidateNested() @Type(() => InvestHistoryDto) history?: InvestHistoryDto;
}
export class InvestCatalogDto extends InvestWriteDto {
  @Matches(id) instrumentId: string;
  @IsInt() @Min(0) expectedVersion: number;
  @IsDefined() @IsObject() @ValidateNested() @Type(() => InvestFactsDto) facts: InvestFactsDto;
}
export class InvestObservationDto extends InvestWriteDto {
  @IsInt() @Min(1) expectedVersion: number;
  @IsDefined() @IsObject() @ValidateNested() @Type(() => InvestQuoteDto) quote: InvestQuoteDto;
}
export class InvestAccessDto extends InvestWriteDto {
  @IsIn(['UNKNOWN', 'ACTIVE', 'FUNDING_REQUIRED']) status: 'UNKNOWN' | 'ACTIVE' | 'FUNDING_REQUIRED';
  @IsBoolean() understood: boolean;
  @IsBoolean() acceptsLock: boolean;
}
export class InvestHoldingInstrumentDto extends InvestWriteDto {
  @Matches(id) instrumentId: string;
}
export class InvestPeerDto {
  @IsIn(['BONDS', 'EQUITY', 'CRYPTO']) assetClass: Asset;
  @IsString() @MaxLength(300) peer: string;
}
export class InvestSelectionDto {
  @IsIn(['BONDS', 'EQUITY', 'CRYPTO']) assetClass: Asset;
  @Matches(id) instrumentId: string;
}
export class InvestEvaluationDto extends InvestWriteDto {
  @Matches(/^20\d{2}-(0[1-9]|1[0-2])$/) month: string;
  @Matches(id) goalId: string;
  @IsIn(['PLAN', 'ACTUAL']) mode: 'PLAN' | 'ACTUAL';
  @IsArray() @ArrayMaxSize(3) @ValidateNested({ each: true }) @Type(() => InvestPeerDto) peers: InvestPeerDto[];
  @IsOptional() @IsArray() @ArrayMaxSize(3) @ValidateNested({ each: true }) @Type(() => InvestSelectionDto) selections?: InvestSelectionDto[];
}
export class InvestReserveDto extends InvestWriteDto {
  @Matches(id) evaluationId: string;
}
export class InvestRealizationDto {
  @Matches(id) instrumentId: string;
  @Matches(precise) quantity: string;
  @Matches(amount) principalIDR: string;
  @Matches(amount) feeIDR: string;
}
export class InvestSettleDto extends InvestWriteDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(3) @ValidateNested({ each: true }) @Type(() => InvestRealizationDto) orders: InvestRealizationDto[];
  @Equals(true) occurredConfirmed: boolean;
  @Equals(true) remainingCashConfirmed: boolean;
  @IsString() @Matches(/\S/) @MaxLength(300) reason: string;
}
export class InvestMarketQuery {
  @IsOptional() @Matches(id) cursor?: string;
  @IsOptional() @IsIn(['INDONESIA', 'GLOBAL', 'CRYPTO']) region?: string;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsIn(['CASH', 'BONDS', 'EQUITY', 'CRYPTO']) assetClass?: Asset;
  @IsOptional() @IsIn(['ELIGIBLE', 'WITHHELD']) gate?: string;
  @IsOptional() @IsIn(['UNKNOWN', 'ACTIVE', 'FUNDING_REQUIRED', 'STALE']) access?: string;
  @IsOptional() @IsString() @MaxLength(300) peer?: string;
}
export class InvestCompareQuery {
  @Matches(/^[a-zA-Z0-9_-]{1,80}(,[a-zA-Z0-9_-]{1,80}){1,2}$/) ids: string;
}
export class InvestReviewQuery {
  @IsOptional() @Matches(id) cursor?: string;
  @IsOptional() @Matches(id) evaluationId?: string;
}
export class InvestReviewAckDto extends InvestWriteDto {
  @Matches(/^[a-f0-9]{64}$/) reviewKey: string;
  @Equals(true) confirmed: boolean;
  @IsString() @Matches(/\S/) @MaxLength(300) note: string;
}
