const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { urlencoded } = require("express");
const crypto = require("crypto");
const bcrypt = require('bcrypt');
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
  insertUsernameAndPasswordPromise,
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

  const row = await authenticateUsernameAndPasswordPromise(
    db,
    usernameAndPasswordQuery
  );

  if (row) {
    console.log("user is authenticated");
  } else {
    console.log("user is missing");
  }
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  console.log("this is registers username: " + username);
  console.log("this is registers password: " + password);
  // TODO: Create a query to add username and password to table now;
  // const query = `INSERT INTO users (username, password) VALUES ('${username}', '${password}');`;
  const query = `INSERT INTO users (username, password) VALUES ('${username}', '${password}');`;
  // let usernameAndPasswordValue = new Boolean(false);
  // console.log("usernameAndPasswordValue before: " + usernameAndPasswordValue);
  // insertUsernameAndPassword(db, username, password, usernameAndPasswordValue);
  // console.log("usernameAndPasswordValue after: " + usernameAndPasswordValue);
  const row = await insertUsernameAndPasswordPromise(db, query);
  console.log("this is row: " + row);
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});

const generateSalt = () => {
  const salt = crypto.randomBytes(16).toString("hex");
  return salt;
};

const combineSaltAndPassword = (salt, password) => {
  const combinedSaltAndPasswordString = salt + password;
  return combinedSaltAndPasswordString;
};

const hashSaltAndPasswordCombination = (saltAndPasswordCombination) => {
  const hash = 
}
