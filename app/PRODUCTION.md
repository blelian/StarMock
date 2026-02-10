# Production Deployment Guide

This guide covers deploying StarMock backend to production on Render.com.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Deployment Steps](#deployment-steps)
- [Health Checks](#health-checks)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying to production:

1. **MongoDB Atlas Cluster** - Production-ready cluster with:
   - Appropriate tier for expected load (M10+ recommended)
   - IP whitelist configured (allow 0.0.0.0/0 for Render)
   - Database user with read/write permissions
   - Connection string ready

2. **Render.com Account** - Free tier available at https://render.com

3. **GitHub Repository** - Code pushed to GitHub with:
   - `olwal-qa` branch ready for deployment
   - All tests passing
   - No security vulnerabilities in dependencies

## Environment Variables

Configure the following environment variables in Render dashboard:

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port (auto-set by Render) | `10000` |
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/starmock` |
| `SESSION_SECRET` | Session encryption key (32+ chars) | Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `FRONTEND_URL` | Frontend origin for CORS | `https://yourdomain.com` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | Uses `FRONTEND_URL` |

### Generating Secure Secrets

```bash
# Generate SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use OpenSSL
openssl rand -hex 32
```

## Deployment Steps

### 1. Create New Web Service on Render

1. Log in to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select the **StarMock** repository
5. Select the **olwal-qa** branch

### 2. Configure Build Settings

| Setting | Value |
|---------|-------|
| **Name** | `starmock-api` (or your choice) |
| **Region** | Choose closest to your users |
| **Branch** | `olwal-qa` |
| **Root Directory** | `app` |
| **Environment** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Instance Type** | Free (or paid for production) |

### 3. Add Environment Variables

In the **Environment** section, add all required variables listed above.

**Important**: Set `NODE_ENV=production` first!

### 4. Configure Health Checks

Render automatically monitors your health endpoint:

| Setting | Value |
|---------|-------|
| **Health Check Path** | `/api/health` |
| **Expected Status** | `200` |
| **Timeout** | `30 seconds` |

### 5. Deploy

1. Click **"Create Web Service"**
2. Render will automatically:
   - Clone your repository
   - Install dependencies
   - Run environment validation
   - Start the server
   - Monitor health checks

### 6. Verify Deployment

Once deployed, verify:

```bash
# Check health endpoint
curl https://your-app.onrender.com/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-15T12:00:00.000Z",
  "uptime": 123.45,
  "environment": "production",
  "database": "connected",
  "memory": {
    "used": 45,
    "total": 512,
    "unit": "MB"
  }
}

# Check readiness
curl https://your-app.onrender.com/api/ready

# Expected response:
{
  "ready": true,
  "checks": {
    "database": true,
    "collections": true,
    "models": true
  },
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

## Health Checks

The application provides two health check endpoints:

### `/api/health` - Liveness Probe

Returns server status and database connectivity. Used by Render to determine if the service should be restarted.

**Response Codes:**
- `200` - Service is healthy
- `503` - Service is unhealthy (database disconnected, etc.)

**Response Fields:**
- `status` - "healthy" or "degraded"
- `timestamp` - Current server time
- `uptime` - Process uptime in seconds
- `environment` - "production" or "development"
- `database` - "connected" or "disconnected"
- `memory` - Memory usage statistics

### `/api/ready` - Readiness Probe

Returns whether the service is ready to accept traffic (database connected, collections exist, models initialized).

**Response Codes:**
- `200` - Service is ready
- `503` - Service is not ready

**Response Fields:**
- `ready` - Boolean indicating readiness
- `checks` - Object with individual check results
- `timestamp` - Current server time

## Startup Validation

The application performs comprehensive validation on startup:

### 1. Environment Validation
- Checks all required environment variables
- Validates MongoDB URI format
- Validates port number and URL formats
- Exits with code 1 if validation fails

### 2. Database Connection
- Connects to MongoDB with retry logic
- Fails fast if connection cannot be established
- Logs masked connection string (password hidden)

### 3. Health Checks
- Verifies database connectivity
- Checks required collections exist
- Creates necessary indexes
- Validates seed data presence
- In production: exits if checks fail
- In development: warns but continues

### 4. Graceful Shutdown

The server handles shutdown signals gracefully:

**Shutdown Process:**
1. Stop accepting new connections
2. Close existing connections
3. Close database connection
4. Exit cleanly with code 0

**Handled Signals:**
- `SIGTERM` - Termination signal (Render uses this)
- `SIGINT` - Interrupt signal (Ctrl+C)
- `uncaughtException` - Unhandled exceptions
- `unhandledRejection` - Unhandled promise rejections

**Timeout:** Forced shutdown after 30 seconds if graceful shutdown hangs.

## Monitoring

### Logs

View logs in Render Dashboard:
1. Go to your service
2. Click **"Logs"** tab
3. Monitor for:
   - Startup validation messages
   - Database connection status
   - Health check results
   - Request logs
   - Error messages

### Key Log Messages

**Successful Startup:**
```
✅ Environment validation passed
✅ Database connected successfully
✅ All startup checks passed
🚀 Server running on port 10000
```

**Failed Startup:**
```
❌ Environment validation failed
❌ Failed to connect to MongoDB
❌ Startup health checks failed in production
```

**Graceful Shutdown:**
```
⚠️  SIGTERM received. Starting graceful shutdown...
✅ Server closed
✅ Database connection closed
👋 Shutdown complete
```

### Metrics to Monitor

1. **Response Times** - API endpoint latency
2. **Error Rates** - 4xx and 5xx responses
3. **Database Performance** - Query execution times
4. **Memory Usage** - Check `/api/health` memory stats
5. **Uptime** - Service availability percentage

### Setting Up Alerts

Configure alerts in Render for:
- Health check failures (automatic)
- High memory usage (>80%)
- Increased error rates
- Deployment failures

## Troubleshooting

### Common Issues

#### 1. Environment Validation Failed

**Symptoms:**
```
❌ Environment validation failed. Exiting...
```

**Solution:**
- Check all required environment variables are set
- Verify MongoDB URI format: `mongodb+srv://user:pass@host/database`
- Ensure `PORT` is a valid number
- Verify `FRONTEND_URL` is a valid URL in production

#### 2. Database Connection Failed

**Symptoms:**
```
❌ Failed to connect to MongoDB
```

**Solutions:**
- Verify MongoDB Atlas IP whitelist includes `0.0.0.0/0`
- Check database user credentials
- Ensure database user has read/write permissions
- Test connection string locally first
- Check MongoDB Atlas cluster is running

#### 3. Health Checks Failing

**Symptoms:**
```
❌ Startup health checks failed in production
```

**Solutions:**
- Check database connection
- Verify collections can be accessed
- Ensure indexes are created successfully
- Review detailed health check logs

#### 4. Port Already in Use (Local Only)

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions:**
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Stop the process (Windows)
Stop-Process -Id <PID> -Force

# Or change PORT in .env
PORT=3001
```

#### 5. Session Not Persisting

**Symptoms:**
- Users get logged out immediately
- Session data not saved

**Solutions:**
- Verify `SESSION_SECRET` is set and consistent
- Check MongoDB connection for session store
- Ensure cookies are being sent (check CORS settings)
- In production, ensure `FRONTEND_URL` matches actual frontend origin

#### 6. CORS Errors

**Symptoms:**
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**Solutions:**
- Set `FRONTEND_URL` to your frontend domain
- Verify `ALLOWED_ORIGINS` if using custom origins
- Check that credentials are included in requests
- Ensure protocol matches (https → https)

### Debug Mode

To enable verbose logging in production (temporary):

1. Add environment variable: `DEBUG=*`
2. Redeploy
3. Check logs for detailed information
4. Remove `DEBUG` variable when done

### Rollback Procedure

If deployment fails:

1. Go to Render Dashboard
2. Select your service
3. Click **"Rollback"** to previous version
4. Fix issues locally
5. Test thoroughly
6. Redeploy

## Security Best Practices

1. **Environment Variables**
   - Never commit `.env` files
   - Use strong, random `SESSION_SECRET`
   - Rotate secrets periodically

2. **Database**
   - Use strong database passwords
   - Enable MongoDB Atlas network encryption
   - Regularly backup database
   - Monitor for unusual access patterns

3. **Dependencies**
   - Keep dependencies up to date
   - Run `npm audit` regularly
   - Review security advisories

4. **CORS**
   - Only allow trusted origins
   - Never use `*` in production
   - Validate requests server-side

5. **Rate Limiting** (Future Enhancement)
   - Consider adding rate limiting middleware
   - Protect against brute force attacks
   - Implement per-user rate limits

## Maintenance

### Regular Tasks

**Weekly:**
- Review error logs
- Check health check status
- Monitor memory usage trends

**Monthly:**
- Update dependencies (`npm update`)
- Review security advisories
- Optimize database indexes
- Clean up old session data

**Quarterly:**
- Performance testing
- Load testing
- Security audit
- Database backup verification

### Database Maintenance

```bash
# Connect to MongoDB and clean old sessions (older than 30 days)
db.sessions.deleteMany({
  expires: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
})

# Optimize indexes
db.sessions.reIndex()
db.users.reIndex()
```

## Support

For issues or questions:

1. Check this documentation
2. Review application logs
3. Check [Render Status Page](https://status.render.com/)
4. Check [MongoDB Atlas Status](https://status.mongodb.com/)
5. Contact development team

## Additional Resources

- [Render Documentation](https://render.com/docs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [Express.js Production Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
