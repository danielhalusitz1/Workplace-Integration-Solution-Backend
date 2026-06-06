import { MongoMemoryServer } from 'mongodb-memory-server';

export async function createMongoMemoryServer(): Promise<MongoMemoryServer> {
  return MongoMemoryServer.create();
}

export async function stopMongoMemoryServer(
  mongoServer: MongoMemoryServer | undefined,
): Promise<void> {
  if (mongoServer) {
    await mongoServer.stop();
  }
}
