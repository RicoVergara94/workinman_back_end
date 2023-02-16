const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { urlencoded } = require("express");
const app = express();
// import { db, runQueries } from "./workinman_db";
const {
  db,
  runQueries,
  authenticateUsername,
  authenticatePassword,
  authenticateUsernameAndPassword,
  authenticateUsernameAndPasswordPromise,
  insertUsernameAndPassword,
} = require("./workinman_db");

const PORT = 3232;

// const corsOptions = {
//   origin: "https://example.com",
// };

// app.use(cors());
app.use(cors());
app.use(bodyParser.json());
app.use(urlencoded({ extended: false }));
app.get("/", (req, res) => {
  res.json("Hello World");
});

app.post("/", async (req, res) => {
  const { username, password } = req.body;

  const usernameAndPasswordQuery = `select username from users where username = '${username}' AND password = '${password}';`;
  let usernameAndPasswordAuthenticated = [1, 2];

  const row = await authenticateUsernameAndPasswordPromise(
    db,
    usernameAndPasswordQuery,
    usernameAndPasswordAuthenticated
  );

  console.log("this is foo: " + JSON.stringify(row));

  if (row) {
    console.log("user is authenticated");
  } else {
    console.log("user is missing");
  }
});

app.post("/register", (req, res) => {
  const { username, password } = req.body;
  console.log("this is registers username: " + username);
  console.log("this is registers password: " + password);
  // TODO: Create a query to add username and password to table now;
  const insertQuery = `INSERT INTO users (username, password) VALUES ('${username}', '${password}');`;

  let usernameAndPasswordValue = new Boolean(false);
  console.log("usernameAndPasswordValue before: " + usernameAndPasswordValue);
  insertUsernameAndPassword(db, username, password, usernameAndPasswordValue);
  console.log("usernameAndPasswordValue after: " + usernameAndPasswordValue);
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
