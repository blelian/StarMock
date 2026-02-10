# MongoDB Setup Guide for StarMock

## Overview
StarMock uses MongoDB Atlas as the database with Mongoose as the ODM (Object Data Modeling) library.

## Database Models

### 1. User Model
Stores user authentication and profile information.
- Email (unique, validated)
- Password (bcrypt hashed)
- Name (first & last)
- Role (user/admin)
- Timestamps

### 2. InterviewQuestion Model
Contains the interview questions library.
- Title & Description
- Type (behavioral, technical, situational, leadership)
- Difficulty (easy, medium, hard)
- Category (teamwork, leadership, problem-solving, etc.)
- STAR Guidelines
- Tags

### 3. InterviewSession Model
Tracks individual interview sessions.
- References User & Question
- Status (in_progress, completed, abandoned)
- Duration tracking
- Timestamps

### 4. InterviewResponse Model
Stores user responses to interview questions.
- References Session, User, & Question
- Response text (50-5000 characters)
- Word count (auto-calculated)
- Submission timestamp

### 5. FeedbackReport Model
Contains AI/rule-based feedback for completed interviews.
- STAR component scores (Situation, Task, Action, Result)
- Overall score
- Strengths, improvements, and tips
- Rating (excellent, good, fair, needs_improvement)
- Evaluator type

## Setup Instructions

### Step 1: Configure Environment Variables

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your MongoDB credentials:
   ```
   MONGODB_URI=mongodb+srv://olwalgeorge:<YOUR_PASSWORD>@cluster0.wncfx.mongodb.net/starmock?retryWrites=true&w=majority
   ```
   
   Replace `<YOUR_PASSWORD>` with your actual MongoDB Atlas password.

3. Update the JWT secret for production:
   ```
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   ```

### Step 2: Install Dependencies

All required packages should already be installed, but if not:
```bash
npm install
```

Key dependencies:
- `mongoose` - MongoDB ODM
- `dotenv` - Environment variable management
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT authentication
- `cookie-parser` - Cookie parsing middleware

### Step 3: Seed the Database

Populate the database with sample interview questions:
```bash
npm run seed
```

This will:
- Connect to MongoDB
- Clear existing questions
- Insert 8 diverse interview questions
- Display a summary of seeded data

### Step 4: Start the Server

```bash
npm start
```

The server will:
- Connect to MongoDB
- Start on port 3000 (or your configured PORT)
- Display connection status

### Step 5: Verify Connection

Check the health endpoint:
```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-10T...",
  "environment": "development",
  "database": "connected"
}
```

## MongoDB Atlas Configuration

### Network Access
Ensure your IP address is whitelisted in MongoDB Atlas:
1. Go to Network Access in MongoDB Atlas
2. Add your current IP address or use `0.0.0.0/0` for development (not recommended for production)

### Database Access
Your credentials are configured in the connection string:
- Username: `olwalgeorge`
- Password: (set in .env)
- Database: `starmock`
- Cluster: `cluster0.wncfx.mongodb.net`

## Best Practices

### Development
- Use `.env` for local development
- Never commit `.env` to version control
- Keep `.env.example` updated with all required variables

### Production
- Use environment variables in your hosting platform (Render, etc.)
- Rotate JWT secrets regularly
- Enable MongoDB Atlas IP whitelisting for production IPs only
- Use strong, unique passwords

### Data Modeling
- All models use timestamps (createdAt, updatedAt)
- Indexes are configured for frequently queried fields
- References use MongoDB ObjectIds
- Validation is enforced at the schema level

## Troubleshooting

### Connection Errors
1. **"MongoServerError: Authentication failed"**
   - Check your password in .env
   - Ensure password doesn't contain special characters that need URL encoding

2. **"MongooseServerSelectionError: connect ECONNREFUSED"**
   - Check your network connection
   - Verify IP is whitelisted in MongoDB Atlas
   - Check connection string format

3. **"Cannot find module"**
   - Run `npm install` to ensure all dependencies are installed
   - Check that all import paths use `.js` extensions

### Seeding Errors
- Ensure MongoDB connection is established before seeding
- Check that the database name in connection string is correct
- Verify you have write permissions

## Next Steps

After MongoDB setup is complete, you can proceed with:
1. ✅ Phase 1: Backend foundation (structure, middleware)
2. 🔄 Phase 2: Data layer (DONE - Models & seed created)
3. ⏭️ Phase 3: Authentication routes
4. ⏭️ Phase 4: Interview API endpoints
5. ⏭️ Phase 5: Feedback engine
6. ⏭️ Phase 6: Testing
7. ⏭️ Phase 7: Deployment

## Resources

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
