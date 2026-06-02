export enum GlobalEvent {
  GOOGLE_ACCESS_TOKEN_REFRESHED = 'GOOGLE_ACCESS_TOKEN_REFRESHED',
}

export type GoogleAccessTokenRefreshedEventPayload = {
  externalAccountId: string;
  accessToken: string;
  expiryDate: number;
};

export class GoogleAccessTokenRefreshedEvent {
  constructor(public payload: GoogleAccessTokenRefreshedEventPayload) {}
}
