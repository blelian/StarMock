import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import connectDB from "./src/config/database.js";
import { sessionMiddleware } from "./src/config/session.js";
import { authRoutes, interviewRoutes } from "./src/routes/index.js";
import { validateEnvironment, getEnvironmentSummary } from "./src/config/validateEnv.js";
import { runStartupChecks, healthCheck, readinessCheck } from "./src/config/healthCheck.js";

dotenv.config();

// Validate environment before starting
if (!validateEnvironment()) {
  console.error("\n❌ Environment validation failed. Exiting...");
  process.exit(1);
}

// Log environment summary
const envSummary = getEnvironmentSummary();
console.log("\n📋 Environment Configuration:");
console.log(`   Environment: ${envSummary.environment}`);
console.log(`   Port: ${envSummary.port}`);
console.log(`   Database: ${envSummary.mongoUri}`);
if (envSummary.frontendUrl) {
  console.log(`   Frontend URL: ${envSummary.frontendUrl}`);
}
console.log("");

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to database
connectDB()
  .then(async () => {
    console.log("✅ Database connected successfully");
    
    // Run startup health checks
    const checksPass = await runStartupChecks();
    if (!checksPass && NODE_ENV === "production") {
      console.error("\n❌ Startup health checks failed in production. Exiting...");
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error("❌ Failed to connect to MongoDB:", err);
    process.exit(1);
  });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(sessionMiddleware);

if (NODE_ENV === "development") {
  app.use((req, res, next) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:5173"];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}

app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

app.get("/api/health", async (req, res) => {
  try {
    const health = await healthCheck();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

app.get("/api/ready", async (req, res) => {
  try {
    const ready = await readinessCheck();
    const statusCode = ready.ready ? 200 : 503;
    res.status(statusCode).json(ready);
  } catch (error) {
    res.status(503).json({
      ready: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

if (NODE_ENV === "development") {
  app.get("/api/session-info", (req, res) => {
    res.json({
      sessionID: req.sessionID,
      session: req.session,
      isAuthenticated: !!req.session?.userId,
    });
  });
}

// API routes
app.use('/api/auth', authRoutes);
app.use('/api', interviewRoutes);

// serve frontend
app.use(express.static(path.join(__dirname, "dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.use((err, req, res, _next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || "Internal server error",
      ...(NODE_ENV === "development" && { stack: err.stack }),
    },
  });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📦 Environment: ${NODE_ENV}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Session management: enabled`);
});

// Graceful shutdown handlers
let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    return;
  }
  
  isShuttingDown = true;
  console.log(`\n⚠️  ${signal} received. Starting graceful shutdown...`);
  
  // Stop accepting new connections
  server.close(async (err) => {
    if (err) {
      console.error("❌ Error closing server:", err);
      process.exit(1);
    }
    
    console.log("✅ Server closed");
    
    // Close database connection
    try {
      const mongoose = await import('mongoose');
      await mongoose.default.connection.close(false);
      console.log("✅ Database connection closed");
    } catch (error) {
      console.error("❌ Error closing database:", error);
    }
    
    console.log("👋 Shutdown complete");
    process.exit(0);
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error("\n❌ Forced shutdown after timeout");
    process.exit(1);
  }, 30000);
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error("❌ Uncaught Exception:", error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});
