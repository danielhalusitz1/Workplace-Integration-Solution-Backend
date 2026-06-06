import { getConnectionToken } from '@nestjs/mongoose';
import { TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection } from 'mongoose';

import {
  createMongoTestingModule,
  CreateMongoTestingModuleOptions,
} from './create-testing-module';
import { createMongoMemoryServer, stopMongoMemoryServer } from './mongo-memory';

export interface MongoTestContext {
  module: TestingModule;
  connection: Connection;
  mongoServer: MongoMemoryServer;
}

type LifecycleOptions = Omit<CreateMongoTestingModuleOptions, 'mongoUri'>;

export function setupMongoTestLifecycle(
  options: LifecycleOptions = {},
): MongoTestContext {
  const ctx = {} as MongoTestContext;

  beforeEach(async () => {
    ctx.mongoServer = await createMongoMemoryServer();
    ctx.module = await createMongoTestingModule({
      ...options,
      mongoUri: ctx.mongoServer.getUri(),
    });
    ctx.connection = ctx.module.get<Connection>(getConnectionToken());
  });

  afterEach(async () => {
    if (ctx.connection) {
      await ctx.connection.close();
    }
    if (ctx.module) {
      await ctx.module.close();
    }
    await stopMongoMemoryServer(ctx.mongoServer);
  });

  afterAll(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  return ctx;
}
