import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { query } from '../config/database';
import { logger } from '../../src/lib/logger';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runMigrations = async () => {
  console.log('DB Config:', {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    db: process.env.DB_NAME
  });
  try {
    const migrationsDir = path.join(__dirname, '../migrations');
    const files = fs.readdirSync(migrationsDir).sort();

    for (const file of files) {
      if (file.endsWith('.sql')) {
        logger.info(`Running migration: ${file}`);
        const migrationPath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(migrationPath, 'utf8');

        await query(sql);
        logger.info(`Migration ${file} completed successfully`);
      }
    }

    logger.info('All migrations completed successfully');
  } catch (error) {
    console.error('Migration error FULL:', error);
    logger.error('Migration failed:', error);
    process.exit(1);
  }
};

if (process.argv[1] === __filename) {
  runMigrations();
}

export { runMigrations };