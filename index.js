const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { urlencoded } = require("express");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const app = express();
// import { db, runQueries } from "./workinman_db";
const {
  db,
  runQueries,
  getAllAccountsPromise,
  getCountOfAllAccountsPromise,
  authenticateUsername,
  authenticatePassword,
  authenticateUsernameAndPassword,
  authenticateUsernameAndPasswordPromise,
  insertUsernamePasswordSaltPromise,
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

  const allAccounts = await getAllAccountsPromise(db);
  console.log(allAccounts);
  const count = await getCountOfAllAccountsPromise(db);
  console.log(count);
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  // generate salt
  const salt = await generateSalt();

  const hashedPasswordWithSalt = await hashPasswordWithSalt(salt, password);

  const query = `INSERT INTO users (username, password, salt) VALUES ('${username}', '${hashedPasswordWithSalt}', '${salt}');`;
  console.log("this is registers username: " + username);
  console.log("this is registers password: " + password);
  // TODO: Create a query to add username and password to table now;
  // const query = `INSERT INTO users (username, password) VALUES ('${username}', '${password}');`;
  // const query = `INSERT INTO users (username, password) VALUES ('${username}', '${password}');`;
  // let usernameAndPasswordValue = new Boolean(false);
  // console.log("usernameAndPasswordValue before: " + usernameAndPasswordValue);
  // insertUsernameAndPassword(db, username, password, usernameAndPasswordValue);
  // console.log("usernameAndPasswordValue after: " + usernameAndPasswordValue);
  const row = await insertUsernamePasswordSaltPromise(db, query);
  const allAccounts = await getAllAccountsPromise(db);
  // console.log("this is row: " + row);
  console.log(allAccounts);
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});

const generateSalt = async () => {
  const salt = await bcrypt.genSalt(10);
  return salt;
};

// const combineSaltAndPassword = (salt, password) => {
//   const combinedSaltAndPasswordString = salt + password;
//   return combinedSaltAndPasswordString;
// };

// const hashSaltAndPasswordCombination = async (saltAndPasswordCombination) => {
//   const hash = await bcrypt.gen
// }

const hashPasswordWithSalt = async (salt, password) => {
  // Combine the salt and the password, and then hash the combination
  const hashedPassword = await bcrypt.hash(password, salt);

  return hashedPassword;
};
