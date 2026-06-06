import {
  DynamicModule,
  ForwardReference,
  Provider,
  Type,
} from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule, TestingModuleBuilder } from '@nestjs/testing';
import { Session, SessionSchema } from 'src/auth/schemas/session.schema';
import {
  ExternalAccount,
  ExternalAccountSchema,
} from 'src/external-account/schemas/external-account.schema';
import { ExternalAccountService } from 'src/external-account/services/external-account.service';
import { MongodbTransactionService } from 'src/mongodb-transaction/mongodb-transaction.service';
import { User, UserSchema } from 'src/user/schemas/user.schema';
import { UserService } from 'src/user/services/user.service';
import {
  UserSettings,
  UserSettingsSchema,
} from 'src/user-settings/schemas/user-settings.schema';
import { UserSettingsService } from 'src/user-settings/services/user-settings.service';

import { MockMongodbTransactionService } from './mocks/mongodb-transaction.mock';
import { schemaTestProviders } from './providers';

export const defaultMongooseFeatures = MongooseModule.forFeature([
  { name: User.name, schema: UserSchema },
  { name: UserSettings.name, schema: UserSettingsSchema },
  { name: Session.name, schema: SessionSchema },
  { name: ExternalAccount.name, schema: ExternalAccountSchema },
]);

export const defaultTestServices = [
  UserService,
  UserSettingsService,
  ExternalAccountService,
] as const;

export const defaultTestProviderOverrides: {
  provide: Type<unknown>;
  useClass: Type<unknown>;
}[] = [
  {
    provide: MongodbTransactionService,
    useClass: MockMongodbTransactionService,
  },
];

type NestImport =
  | Type<unknown>
  | DynamicModule
  | Promise<DynamicModule>
  | ForwardReference;

export interface CreateMongoTestingModuleOptions {
  mongoUri: string;
  providers?: Provider[];
  imports?: NestImport[];
  configure?: (builder: TestingModuleBuilder) => TestingModuleBuilder;
}

export function createMongoTestingModuleBuilder(
  options: CreateMongoTestingModuleOptions,
): TestingModuleBuilder {
  const { mongoUri, providers = [], imports = [], configure } = options;

  let builder = Test.createTestingModule({
    imports: [
      MongooseModule.forRoot(mongoUri),
      defaultMongooseFeatures,
      ...imports,
    ],
    providers: [
      ...defaultTestServices,
      ...schemaTestProviders,
      MongodbTransactionService,
      ...providers,
    ],
  });

  for (const override of defaultTestProviderOverrides) {
    builder = builder
      .overrideProvider(override.provide)
      .useClass(override.useClass);
  }

  if (configure) {
    builder = configure(builder);
  }

  return builder;
}

export async function createMongoTestingModule(
  options: CreateMongoTestingModuleOptions,
): Promise<TestingModule> {
  return createMongoTestingModuleBuilder(options).compile();
}
