import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import booksRoute from "./routes/booksRoute.js";

// Load environment variables from .env file
dotenv.config();

const app = express();

// Middleware for parsing request body
app.use(express.json());


// Middleware for handling CORS POLICY
app.use(
  cors({
    origin: "http://35.153.99.174", // Update with your actual frontend URL
  })
);

app.get("/", (req, res) => {
  console.log(req);
  return res.status(200).send("Welcome to MERN Stack Book Shop");
});

app.use("/books", booksRoute);


// Start the server
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}!`);
});
