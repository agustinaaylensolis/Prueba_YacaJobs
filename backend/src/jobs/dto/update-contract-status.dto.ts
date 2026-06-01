import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export enum ContractAction {
  CONFIRM = 'CONFIRM',
  REJECT = 'REJECT',
}

export class UpdateContractStatusDto {
  @IsInt()
  @Min(1)
  actorId!: number;

  @IsString()
  actorRole!: 'CLIENT' | 'WORKER';

  @IsEnum(ContractAction)
  action!: ContractAction;

  @IsOptional()
  @IsString()
  note?: string;
}
