import express from "express";
import dotenv from "dotenv";
import cors from 'cors';
import { MongoClient } from "mongodb";
import bcrypt from "bcrypt"


dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: "http://localhost:3001",
  methods: ["GET", "POST", "PUT", "DELETE"]
}));

app.use(express.json());

const client = new MongoClient(process.env.DATABASE_URL);

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB Connected");

    const db = client.db("care_nest");
    const usersCollection = db.collection("users");
    const BookingCollection = db.collection("booking");

    // Register API
    app.post("/register", async (req, res) => {
      try {
        const { name, email, password } = req.body;
        const existing = await usersCollection.findOne({
          email: req.body.email
        })
        if (existing) {
          return res.status(400).json({
            message: "Email Already Existing"
          })
        }
        const hashedPassword = await bcrypt.hash(password, 10)


        const result = await usersCollection.insertOne({
          name, 
          email, 
          password: hashedPassword,
        });
        res.status(201).json(
          {
            message: "User registered successfully",
            result
          },
        );
      } catch (error) {

        res.status(500).json({ message: "Failed to register user", error });
      }
    });
    //users get API
    app.get("/users", async (req, res) => {
      try {
        const result = await usersCollection.find().toArray();
        res.status(200).json(result);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch users", error });
      }
    });
  // Booking API
  app.post("/booking", async (req, res) => {
    try {
      const result = await BookingCollection.insertOne(req.body);
      res.status(201).json({
        message: "Booking created successfully",
        result,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to book", error });
    }
  });
  // booking Get API
  app.get("/booking", async (req, res) => {
    try {
      const result = await BookingCollection.find().toArray();
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch booking", error });
    }
  });
  } catch (error) {
    console.log(error);
  }
}

run().catch(console.dir);


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});