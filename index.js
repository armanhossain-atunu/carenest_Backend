import express from "express";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const client = new MongoClient(process.env.DATABASE_URL);

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB Connected");

    const db = client.db("care_nest");
    const usersCollection = db.collection("users");

    // Register API
    app.post("/register", async (req, res) => {
      try {
        const user = req.body;
        const result = await usersCollection.insertOne(user);
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
    app.get("/users", async (req, res) => {
      try {
        const result = await usersCollection.find().toArray();
        res.status(200).json(result);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch users", error });
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