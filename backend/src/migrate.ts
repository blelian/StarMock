import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
    const migrationsDir = path.join(__dirname, "..", "..", "migrations");
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

    for (const file of files) {
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, "utf8");
        console.log(`Running migration: ${file}`);
        await pool.query(sql);
    }

    console.log("Migrations complete.");
    await pool.end();
}

migrate().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
});
