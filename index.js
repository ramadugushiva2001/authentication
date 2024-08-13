const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const jwt = require("jsonwebtoken");
const cors = require('cors');

const app = express();
const dbPath = path.join(__dirname, "notes_app.db");
const jwtSecret = "MY_SECRET_TOKEN"; // Define your secret here

app.use(cors());
app.use(express.json());

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

// Error Handling Middleware
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
};

// Apply middleware globally
app.use(express.json());

// SIGNUP API
app.post("/signup", async (req, res) => {
  try {
    const { username, password, email } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const existingUser = await db.get("SELECT * FROM users WHERE username = ?", [username]);

    if (existingUser) {
      return res.status(401).send("User already exists");
    }

    await db.run("INSERT INTO users (username, password, email) VALUES (?, ?, ?)", [username, hashedPassword, email]);
    res.send("User registered successfully");
  } catch (error) {
    res.status(500).send("Server Error");
  }
});

// LOGIN API
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await db.get("SELECT * FROM users WHERE username = ?", [username]);

    if (!user) {
      return res.status(400).send("Invalid User");
    }

    const isPasswordMatched = await bcrypt.compare(password, user.password);
    if (isPasswordMatched) {
      const token = jwt.sign({ username }, jwtSecret);
      res.json({ jwtToken: token });
    } else {
      res.status(400).send("Invalid Password");
    }
  } catch (error) {
    res.status(500).send("Server Error");
  }
});

// Error Handling Middleware should be added after all routes
app.use(errorHandler);

module.exports = app;
