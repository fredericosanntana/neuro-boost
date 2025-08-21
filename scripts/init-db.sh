#!/bin/bash
set -e

# Database security initialization script

# Create read-only user for monitoring
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create monitoring user with limited privileges
    CREATE USER monitoring WITH PASSWORD 'monitor_readonly_pass';
    GRANT CONNECT ON DATABASE $POSTGRES_DB TO monitoring;
    GRANT USAGE ON SCHEMA public TO monitoring;
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO monitoring;
    GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO monitoring;
    
    -- Set default privileges for future objects
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO monitoring;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO monitoring;

    -- Create security audit table
    CREATE TABLE IF NOT EXISTS security_audit (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        action VARCHAR(255) NOT NULL,
        resource VARCHAR(255),
        ip_address INET,
        user_agent TEXT,
        success BOOLEAN DEFAULT true,
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Create index for performance
    CREATE INDEX IF NOT EXISTS idx_security_audit_created_at ON security_audit (created_at);
    CREATE INDEX IF NOT EXISTS idx_security_audit_user_id ON security_audit (user_id);
    CREATE INDEX IF NOT EXISTS idx_security_audit_action ON security_audit (action);
    
    -- Create session management table
    CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        session_token VARCHAR(255) NOT NULL UNIQUE,
        refresh_token VARCHAR(255),
        ip_address INET,
        user_agent TEXT,
        expires_at TIMESTAMP NOT NULL,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        revoked BOOLEAN DEFAULT false
    );
    
    CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions (session_token);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions (user_id);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions (expires_at);
    
    -- Security configurations
    ALTER SYSTEM SET log_connections = 'on';
    ALTER SYSTEM SET log_disconnections = 'on';
    ALTER SYSTEM SET log_statement = 'all';
    ALTER SYSTEM SET log_min_duration_statement = 1000;
    
    SELECT pg_reload_conf();
EOSQL

echo "Database security initialization completed successfully"