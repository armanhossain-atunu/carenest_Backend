
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import dns from "node:dns";
import { MongoClient } from "mongodb";
import bcrypt from "bcrypt";

dotenv.config();

// Configure DNS before connecting to MongoDB
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: "http://localhost:3000",
  })
);

app.use(express.json());

// MongoDB connection
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing from .env");
  process.exit(1);
}

const client = new MongoClient(process.env.DATABASE_URL);

let usersCollection;
let bookingCollection;

// Register API
app.post("/register", async (req, res) => {
  try {
    const { name, email, images, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required",
      });
    }

    const existingUser = await usersCollection.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await usersCollection.insertOne({
      name,
      email,
      images,
      password: hashedPassword,
      createdAt: new Date(),
    });

    return res.status(201).json({
      message: "User registered successfully",
      userId: result.insertedId,
    });
  } catch (error) {
    console.error("Register error:", error);

    return res.status(500).json({
      message: "Failed to register user",
    });
  }
});

// Login API
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await usersCollection.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Never return the stored password hash
    const { password: _, ...safeUser } = user;

    return res.status(200).json({
      message: "Login successful",
      user: safeUser,
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Failed to login",
    });
  }
});

// Get all users (without password hashes)
app.get("/users", async (req, res) => {
  try {
    const users = await usersCollection
      .find({})
      .project({ password: 0 })
      .toArray();

    return res.status(200).json(users);
  } catch (error) {
    console.error("Get users error:", error);

    return res.status(500).json({
      message: "Failed to fetch users",
    });
  }
});

// Get user by email
app.get("/users/:email", async (req, res) => {
  try {
    const email = req.params.email;

    const user = await usersCollection.findOne(
      { email },
      { projection: { password: 0 } }
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error("Get user error:", error);

    return res.status(500).json({
      message: "Failed to fetch user",
    });
  }
});

// Create booking
app.post("/booking", async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        message: "Booking data is required",
      });
    }

    const result = await bookingCollection.insertOne({
      ...req.body,
      createdAt: new Date(),
    });

    return res.status(201).json({
      message: "Booking created successfully",
      bookingId: result.insertedId,
    });
  } catch (error) {
    console.error("Create booking error:", error);

    return res.status(500).json({
      message: "Failed to create booking",
    });
  }
});

// Get all bookings
app.get("/booking", async (req, res) => {
  try {
    const bookings = await bookingCollection.find({}).toArray();

    return res.status(200).json(bookings);
  } catch (error) {
    console.error("Get bookings error:", error);

    return res.status(500).json({
      message: "Failed to fetch bookings",
    });
  }
});

// Basic health check
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Care Nest API is running",
  });
});

// Start server only after MongoDB connects
async function startServer() {
  try {
    await client.connect();

    const db = client.db("care_nest");

    usersCollection = db.collection("users");
    bookingCollection = db.collection("booking");

    console.log("Connected to MongoDB successfully");

    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exitCode = 1;
  }
}

startServer();

// Graceful shutdown
async function shutdown() {
  try {
    await client.close();
    console.log("MongoDB connection closed");
  } catch (error) {
    console.error("Error closing MongoDB connection:", error);
  } finally {
    process.exit(0);
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
