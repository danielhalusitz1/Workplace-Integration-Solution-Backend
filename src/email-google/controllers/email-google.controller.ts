import { Controller } from '@nestjs/common';

import { EmailGoogleService } from '../services/email-google.service';

@Controller('email-google')
export class EmailGoogleController {
  constructor(private readonly emailGoogleService: EmailGoogleService) {}
}
