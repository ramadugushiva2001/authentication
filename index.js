// const { onRequest } = require("firebase-functions/v2/https");
// const logger = require("firebase-functions/logger");

const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");
const functions = require("firebase-functions/v2/https"); // Ensure this import remains

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "notes_app.db");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

// USERS API //
app.get("/users", async (req, res) => {
  const selectUserQuery = `SELECT * FROM users`;
  const dbUser = await db.all(selectUserQuery);
  res.send(dbUser);
});

// LOGIN API //
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const selectUserQuery = `SELECT * FROM users WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    res.status(400).send("Invalid User");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);

    if (isPasswordMatched) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      res.send({ jwtToken });
    } else {
      res.status(400).send("Invalid Password");
    }
  }
});

// REGISTER API //
app.post("/signup", async (req, res) => {
  const { username, password, email } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `SELECT * FROM users WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser !== undefined) {
    res.status(401).send("User already exists");
  } else {
    const createNewUser = `INSERT INTO users (username, password, email) VALUES ("${username}", "${hashedPassword}", "${email}")`;
    await db.run(createNewUser);
    res.send("User created successfully");
  }
});

// CREATE NOTE //
app.post("/notes", async (req, res) => {
  const { title, content, archived, user_id } = req.body;
  const createNoteQuery = `INSERT INTO notes (title, content, archived, user_id) VALUES ("${title}", "${content}", "${archived}", "${user_id}")`;
  await db.run(createNoteQuery);
  res.send("Note Added Successfully");
});

// GET NOTES BY USER ID //
app.get("/all_notes/:userId/", async (req, res) => {
  const { userId } = req.params;
  const getNotes = `SELECT * FROM notes WHERE user_id='${userId}'`;
  const notes = await db.all(getNotes);
  res.send(notes);
});

// Export the Express app as a Firebase Function
exports.api = functions.onRequest(app);
