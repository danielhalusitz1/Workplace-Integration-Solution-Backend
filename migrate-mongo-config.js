// In this file you can configure migrate-mongo

const config = {
  mongodb: {
    url: process.env.MONGODB_URI,
    databaseName: process.env.MONGODB_DB,
  },

  migrationsDir: 'migrations',
  changelogCollectionName: 'migrations',
  lockCollectionName: 'migrations-lock',
  lockTtl: 0,
  migrationFileExtension: '.ts',
  useFileHash: false,
  moduleSystem: 'commonjs',
};

module.exports = config;
