import { ArrayMaxSize, ArrayUnique, Equals, IsArray, IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

export class InvestMonthQuery {
  @IsOptional() @Matches(/^(20\d{2})-(0[1-9]|1[0-2])$/) month?: string;
}

export class InvestCashDto {
  @Matches(/^(20\d{2})-(0[1-9]|1[0-2])$/) month: string;
  @Matches(/^(0|[1-9]\d{0,15})(\.\d{1,2})?$/) amountIDR: string;
  @Equals(true) confirmed: boolean;
  @Matches(/^[a-f0-9]{64}$/) expectedRevision: string;
}

export class InvestEventDto {
  @Matches(/^(20\d{2})-(0[1-9]|1[0-2])$/) month: string;
  @Matches(/^[a-f0-9]{64}$/) expectedRevision: string;
  @IsInt() @Min(0) expectedVersion: number;
  @IsIn(['SCHEDULED', 'PARTIAL', 'COMPLETED', 'CANCELLED', 'MISSED']) status: 'SCHEDULED' | 'PARTIAL' | 'COMPLETED' | 'CANCELLED' | 'MISSED';
  @IsString() @MaxLength(300) @Matches(/\S/) reason: string;
  @IsArray() @ArrayUnique() @ArrayMaxSize(100) @IsInt({ each: true }) @Min(1, { each: true }) incomeIds: number[];
  @IsOptional() @Matches(/^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/) rescheduleTo?: string;
}
