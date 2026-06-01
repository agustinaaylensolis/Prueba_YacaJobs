import { IsInt, IsOptional, Min } from 'class-validator';

export class OpenConversationDto {
  @IsInt()
  @Min(1)
  clientId!: number;

  @IsInt()
  @Min(1)
  workerId!: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  publicationId?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  postulationId?: number;
}
