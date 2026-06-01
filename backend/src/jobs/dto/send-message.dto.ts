import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class SendMessageDto {
  @IsInt()
  @Min(1)
  senderId!: number;

  @IsString()
  @IsNotEmpty()
  senderRole!: 'CLIENT' | 'WORKER';

  @IsString()
  @IsNotEmpty()
  content!: string;
}
