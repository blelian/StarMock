import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
}

// pg's SASL client requires password to be a string; connectionString with no password yields undefined
const url = new URL(connectionString.replace(/^postgresql:\/\//, "postgres://"));
const poolConfig: pg.PoolConfig =
    url.password !== ""
        ? { connectionString }
        : {
            host: url.hostname || "localhost",
            port: url.port ? parseInt(url.port, 10) : 5432,
            database: url.pathname?.slice(1) || "starmock",
            user: url.username || undefined,
            password: "",
        };

export const pool = new Pool(poolConfig);
