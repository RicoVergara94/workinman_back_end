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
  doesUsernameExistInDbPromise,
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
  // take the password DONE
  // add salt in table to password
  // hash password combined with salt with bcrypt
  // compare to password in database
  const { salt } = await new Promise((res, rej) => {
    const query = `select * from users where username='${username}';`;
    db.get(query, [], (err, rows) => {
      if (err) {
        rej(err);
      } else {
        res(rows);
      }
    });
  });
  // console.log("this is salt: " + salt);
  // console.log("this is myRow: " + myRow);

  // const passwordWithSalt = password + salt;

  const hashedPasswordWithSalt = await hashPasswordWithSalt(salt, password);

  const usernameAndPasswordQuery = `select username from users where username = '${username}' AND password = '${hashedPasswordWithSalt}';`;

  const row = await authenticateUsernameAndPasswordPromise(
    db,
    usernameAndPasswordQuery
  );

  if (row) {
    console.log("user is authenticated");
  } else {
    console.log("user is missing");
  }

  // const allAccounts = await getAllAccountsPromise(db);
  // console.log(allAccounts);
  // const count = await getCountOfAllAccountsPromise(db);
  // console.log(count);
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  // generate salt
  const doesUsernameAlreadyExist = await doesUsernameExistInDbPromise(
    db,
    username
  );
  if (doesUsernameAlreadyExist) {
    console.log("username already exists");
    return;
  }
  const salt = await generateSalt();

  const hashedPasswordWithSalt = await hashPasswordWithSalt(salt, password);

  const query = `INSERT INTO users (username, password, salt) VALUES ('${username}', '${hashedPasswordWithSalt}', '${salt}');`;
  console.log("this is registers username: " + username);
  console.log("this is registers password: " + password);

  const row = await insertUsernamePasswordSaltPromise(db, query);
  const allAccounts = await getAllAccountsPromise(db);

  console.log(allAccounts);
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});

const generateSalt = async () => {
  const salt = await bcrypt.genSalt(10);
  return salt;
};

const hashPasswordWithSalt = async (salt, password) => {
  // Combine the salt and the password, and then hash the combination
  const hashedPassword = await bcrypt.hash(password, salt);

  return hashedPassword;
};

db.all("select * from users;", [], (err, rows) => {
  if (err) {
    console.log(err);
  } else {
    console.log(rows);
  }
});
