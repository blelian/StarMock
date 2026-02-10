/**
 * Session Management Middleware for StarMock
 *
 * This middleware provides MongoDB-backed session storage using express-session
 * and connect-mongo. Sessions persist across server restarts and are automatically
 * cleaned up when they expire.
 *
 * Features:
 * - MongoDB session storage
 * - Encrypted session data
 * - Automatic session cleanup (TTL)
 * - CSRF protection via SameSite cookies
 * - Secure cookies in production (HTTPS only)
 * - Session helpers for common operations
 *
 * Usage Examples:
 * ================
 *
 * 1. PROTECT ROUTES (Require Authentication)
 * ------------------------------------------
 * import { requireAuth } from '../middleware/auth.js';
 *
 * router.get('/profile', requireAuth, (req, res) => {
 *   // req.userId is available
 *   // req.session.user contains user data
 *   res.json({ user: req.session.user });
 * });
 *
 *
 * 2. LOGIN - SET SESSION
 * ----------------------
 * import { sessionHelpers } from '../config/session.js';
 *
 * router.post('/login', async (req, res) => {
 *   const user = await User.findOne({ email: req.body.email });
 *
 *   // Regenerate session ID for security
 *   await sessionHelpers.regenerateSession(req);
 *
 *   // Set user session
 *   sessionHelpers.setUserSession(req, user._id, {
 *     email: user.email,
 *     firstName: user.firstName,
 *     lastName: user.lastName,
 *     role: user.role
 *   });
 *
 *   res.json({ message: 'Logged in successfully' });
 * });
 *
 *
 * 3. LOGOUT - CLEAR SESSION
 * -------------------------
 * router.post('/logout', requireAuth, async (req, res) => {
 *   await sessionHelpers.clearUserSession(req);
 *   res.json({ message: 'Logged out successfully' });
 * });
 *
 *
 * 4. CHECK AUTHENTICATION STATUS
 * ------------------------------
 * router.get('/me', (req, res) => {
 *   if (sessionHelpers.isAuthenticated(req)) {
 *     res.json({ user: req.session.user });
 *   } else {
 *     res.status(401).json({ error: 'Not authenticated' });
 *   }
 * });
 *
 *
 * 5. GUEST ROUTES (Redirect if Already Logged In)
 * -----------------------------------------------
 * import { requireGuest } from '../middleware/auth.js';
 *
 * router.post('/signup', requireGuest, async (req, res) => {
 *   // This only executes if user is NOT logged in
 *   // ... signup logic
 * });
 *
 *
 * 6. ADMIN ROUTES
 * ---------------
 * import { requireAdmin } from '../middleware/auth.js';
 *
 * router.get('/admin/users', requireAdmin, async (req, res) => {
 *   // Only accessible by admin users
 *   const users = await User.find();
 *   res.json({ users });
 * });
 *
 *
 * 7. OPTIONAL AUTHENTICATION
 * --------------------------
 * import { optionalAuth } from '../middleware/auth.js';
 *
 * router.get('/questions', optionalAuth, async (req, res) => {
 *   // Works for both authenticated and guest users
 *   // req.userId will be set if authenticated, null otherwise
 *   const questions = await InterviewQuestion.find();
 *   res.json({ questions });
 * });
 *
 *
 * 8. REFRESH SESSION (Extend Expiry)
 * ----------------------------------
 * import { refreshSession } from '../middleware/auth.js';
 *
 * router.use(refreshSession); // Apply to all routes
 *
 *
 * 9. GET SESSION INFO (Debugging)
 * -------------------------------
 * router.get('/session-debug', (req, res) => {
 *   const info = sessionHelpers.getSessionInfo(req);
 *   res.json(info);
 * });
 *
 *
 * Session Data Structure:
 * =======================
 * req.session = {
 *   userId: ObjectId,
 *   user: {
 *     id: ObjectId,
 *     email: String,
 *     firstName: String,
 *     lastName: String,
 *     role: String
 *   },
 *   loginTime: ISOString,
 *   cookie: {
 *     maxAge: Number,
 *     expires: Date,
 *     httpOnly: Boolean,
 *     secure: Boolean
 *   }
 * }
 *
 *
 * MongoDB Collections:
 * ====================
 * Sessions are stored in the 'sessions' collection with:
 * - Automatic TTL-based expiration
 * - Encrypted session data
 * - Indexed by session ID
 *
 *
 * Security Features:
 * ==================
 * 1. HttpOnly cookies - Prevents XSS attacks
 * 2. Secure flag in production - HTTPS only
 * 3. SameSite cookies - CSRF protection
 * 4. Encrypted session data in MongoDB
 * 5. Session regeneration after login - Prevents session fixation
 * 6. Automatic cleanup of expired sessions
 *
 *
 * Environment Variables:
 * ======================
 * SESSION_SECRET - Secret for signing session cookies (required)
 * MONGODB_URI - MongoDB connection string (required)
 * NODE_ENV - Environment (development/production)
 *
 *
 * Configuration:
 * ==============
 * Default session duration: 7 days
 * Touch after: 24 hours (lazy update)
 * Auto-remove interval: 10 minutes
 * Cookie name: starmock.sid
 */

export default {}
