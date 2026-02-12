import express from "express"
import path from "path"
import { fileURLToPath } from "url"

const app = express()
const PORT = process.env.PORT || 3000

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// -----------------------
// Middleware
// -----------------------
app.use(express.json()) // parse JSON bodies

// -----------------------
// Placeholder API
// -----------------------
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" })
})

// -----------------------
// Auth API
// -----------------------
let users = [] // temporary in-memory store for demonstration

// Signup
app.post("/api/auth/signup", (req, res) => {
  const { email, password, fullName } = req.body

  if (!email || !password || !fullName) {
    return res.status(400).json({ message: "Missing fields" })
  }

  // Check if user already exists
  const exists = users.find(u => u.email === email)
  if (exists) return res.status(409).json({ message: "User already exists" })

  // Save user (in memory)
  users.push({ email, password, fullName })
  return res.json({ message: "Signup successful" })
})

// Login
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: "Missing fields" })
  }

  const user = users.find(u => u.email === email && u.password === password)
  if (!user) return res.status(401).json({ message: "Invalid credentials" })

  return res.json({ message: "Login successful" })
})

// -----------------------
// Serve frontend
// -----------------------
app.use(express.static(path.join(__dirname, "public")))

// All other routes → serve login.html or index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"))
})

// -----------------------
// Start server
// -----------------------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
