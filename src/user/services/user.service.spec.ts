import {
  defaultUserCreate,
  setupMongoTestLifecycle,
  UserTestProvider,
} from 'src/test';

import { UserService } from './user.service';

describe('UserService', () => {
  const ctx = setupMongoTestLifecycle();

  let userService: UserService;
  let userTestProvider: UserTestProvider;

  beforeEach(() => {
    userService = ctx.module.get(UserService);
    userTestProvider = ctx.module.get(UserTestProvider);
  });

  it('persists a user document in MongoDB', async () => {
    const payload = defaultUserCreate({
      firstName: 'Jane',
      lastName: 'Doe',
    });

    const created = await userService.create(payload);

    expect(created.firstName).toBe('Jane');
    expect(created.lastName).toBe('Doe');
    expect(created._id).toBeDefined();

    const stored = await userTestProvider.findById(created._id.toString());
    expect(stored).not.toBeNull();
    expect(stored?.firstName).toBe('Jane');
    expect(stored?.lastName).toBe('Doe');
  });

  it('finds a user by filters', async () => {
    const seeded = await userTestProvider.create({
      firstName: 'Filter',
      lastName: 'Me',
    });

    const found = await userService.findOneByFilters({
      _id: seeded._id,
    });

    expect(found).not.toBeNull();
    expect(found?.firstName).toBe('Filter');
  });
});
