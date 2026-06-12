import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Email, EmailSchema } from './schemas/email.schema';
import { EmailService } from './services/email.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Email.name, schema: EmailSchema }]),
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
