const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const jwt = require("jsonwebtoken");
const app = express();
const dbPath = path.join(__dirname, "notes_app.db");

const cors = require('cors');
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

// USERS API
app.get("/users", async (request, response) => {
  const selectUserQuery = `SELECT * FROM users`;
  const dbUser = await db.all(selectUserQuery);
  response.send(dbUser);
});

// LOGIN API
app.post("/login", async (request, response) => {
  const { username, password } = request.body;

  const selectUserQuery = `SELECT * FROM users WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400).send("Invalid User");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);

    if (isPasswordMatched === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400).send("Invalid Password");
    }
  }
});

// REGISTER API
app.post("/signup", async (request, response) => {
  const { username, password, email } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `SELECT * FROM users WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser !== undefined) {
    response.status(401).send("User already exists");
  } else {
    const createNewUser = `INSERT INTO users (username, password, email) VALUES ('${username}', '${hashedPassword}', '${email}')`;
    await db.run(createNewUser);
    response.send("User registered successfully");
  }
});

// CREATE NOTE
app.post("/notes", async (request, response) => {
  const { title, content, archived, user_id } = request.body;
  const createNoteQuery = `INSERT INTO notes (title, content, archived, user_id) VALUES ('${title}', '${content}', '${archived}', '${user_id}')`;
  await db.run(createNoteQuery);
  response.send("Note Added Successfully");
});

// GET NOTES
app.get("/all_notes/:userId", async (request, response) => {
  const { userId } = request.params;
  const getNotes = `SELECT * FROM notes WHERE user_id='${userId}'`;
  const notes = await db.all(getNotes);
  response.send(notes);
});



