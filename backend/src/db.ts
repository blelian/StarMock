import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
}

// pg's SASL client requires password to be a string; connectionString with no password yields undefined
const url = new URL(connectionString.replace(/^postgresql:\/\//, "postgres://"));

// For Neon and other cloud providers, SSL is often required.
// Adding ssl: true or setting it via query params is common.
const poolConfig: pg.PoolConfig = {
    connectionString,
    ssl: connectionString.includes('sslmode=') ? undefined : {
        rejectUnauthorized: false // Common for self-signed or cloud certs if not fully configured
    }
};

if (url.password === "") {
    Object.assign(poolConfig, {
        host: url.hostname || "localhost",
        port: url.port ? parseInt(url.port, 10) : 5432,
        database: url.pathname?.slice(1) || "starmock",
        user: url.username || undefined,
        password: "",
        connectionString: undefined // Use manual config if password is empty
    });
}

export const pool = new Pool(poolConfig);
