import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        path.join(__dirname, "./index.html"),
        path.join(__dirname, "./src/**/*.{js,ts,jsx,tsx}"),
    ],
    theme: {
        extend: {
            colors: {
                primary: "#6366f1",
                "primary-hover": "#4f46e5",
                "bg-dark": "#0f172a",
                "bg-card": "#1e293b",
                "text-main": "#f8fafc",
                "text-muted": "#94a3b8",
                accent: "#ec4899",
                success: "#22c55e",
                error: "#ef4444",
                glass: "rgba(30, 41, 59, 0.7)",
                "glass-border": "rgba(255, 255, 255, 0.1)",
            },
        },
    },
    plugins: [],
}
