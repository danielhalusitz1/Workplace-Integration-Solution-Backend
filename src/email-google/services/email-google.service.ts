import { Injectable } from '@nestjs/common';
import { ExternalAccountService } from 'src/external-account/services/external-account.service';
import { GoogleClientService } from 'src/google-client/services/google-client.service';

@Injectable()
export class EmailGoogleService {
  constructor(
    private readonly googleClientService: GoogleClientService,
    private readonly externalAccountService: ExternalAccountService,
  ) {}
}
