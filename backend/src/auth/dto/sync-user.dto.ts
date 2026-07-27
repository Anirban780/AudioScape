import { IsEmail, IsOptional, IsString } from 'class-validator';

export class SyncUserDto {
  @IsString()
  authId: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}
