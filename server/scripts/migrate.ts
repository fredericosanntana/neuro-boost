import fs from 'fs';
import path from 'path';
import { query } from '../config/database';
import { logger } from '../../src/lib/logger';

const runMigrations = async () => {
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
    logger.error('Migration failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  runMigrations();
}

export { runMigrations };