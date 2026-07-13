import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ClassifyEmailDto {
  @IsString({ message: 'body must be a string' })
  @IsNotEmpty({ message: 'body must not be empty' })
  @MaxLength(100_000, { message: 'body exceeds the 100,000 character limit' })
  body!: string;
}
