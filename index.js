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

app.post("/", (req, res) => {
  console.log(req.body);

  const { username, password } = req.body;
  // const queries = [
  //   `
  // select username from users where username = '${username}';
  // `,
  //   `
  // select password from users where password = '${password}';
  // `,
  // ];
  const usernameQuery = `select username from users where username = '${username}';`;

  const passwordQuery = `select password from users where password = '${password}';`;
  // console.log("here right now");
  // console.log(db);
  // runQueries(db, queries);
  // queries.map((q) => authenticate(q));
  let usernameValue = new Boolean(false);
  authenticateUsername(db, usernameQuery, usernameValue);
  console.log(usernameValue);
  let passwordValue = new Boolean(false);
  authenticatePassword(db, passwordQuery, passwordValue);
  console.log(passwordValue);
  if (usernameValue && passwordValue) {
    console.log("user is authenticated");
  } else {
    console.log("user is missing");
  }
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
