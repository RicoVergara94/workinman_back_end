const express = require("express");
const fs = require("fs");
const util = require("util");
const unlinkFile = util.promisify(fs.unlink);
const cors = require("cors");
const bodyParser = require("body-parser");
const { urlencoded } = require("express");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const multer = require("multer");
const { uploadFile, getFileStream, PutObjectCommand } = require("./s3");
const app = express();

const {
  db,
  runQueries,
  doesUsernameExistInDbPromise,
  getSaltPromise,
  getPasswordAndSaltHash,
  getAllAccountsPromise,
  getCountOfAllAccountsPromise,
  authenticateUsername,
  authenticateUsernamePromise,
  authenticatePassword,
  authenticateUsernameAndPassword,
  authenticateUsernameAndPasswordPromise,
  insertUsernamePasswordSaltPromise,
  insertUsernameAndPasswordPromise,
  deleteRecordPromise,
} = require("./workinman_db");

const storage = multer.memoryStorage();

const upload = multer({ storage: storage });

const PORT = 3232;

const bucketName = process.env.BUCKET_NAME;
const bucketRegion = process.env.BUCKET_REGION;
const accessKey = process.env.ACCESS_KEY;
const secretAccessKey = process.env.SECRET_ACCESS_KEY;

// const corsOptions = {
//   origin: "https://example.com",
// };
app.use(cors());
app.use(bodyParser.json());
app.use(urlencoded({ extended: false }));
app.get("/", (req, res) => {
  res.json("Hello World");
});

app.post("/", async (req, res) => {
  const { username, password } = req.body;

  const usernameData = await authenticateUsernamePromise(db, username);
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

  const hashedPasswordWithSalt = await hashPasswordWithSalt(password, salt);

  const usernameAndPasswordQuery = `select username from users where username = '${username}' AND password = '${hashedPasswordWithSalt}';`;

  const row = await authenticateUsernameAndPasswordPromise(
    db,
    username,
    hashedPasswordWithSalt
  );

  if (row) {
    console.log("user is authenticated");
    res.status(200).send("user is authenticated");
  } else {
    console.log("user is missing");
    res.status(409).send("Username does not exist");
  }
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const doesUsernameAlreadyExist = await doesUsernameExistInDbPromise(
    db,
    username
  );
  if (doesUsernameAlreadyExist) {
    console.log("username already exists");
    res.status(409).send("Username already exists");
    return;
  }
  const salt = await generateSalt();

  const hashedPasswordWithSalt = await hashPasswordWithSalt(password, salt);

  await insertUsernamePasswordSaltPromise(
    db,
    username,
    hashedPasswordWithSalt,
    salt
  );
  const query = `select * from users where username='${username}';`;
  const row = await new Promise((res, rej) => {
    db.get(query, [], (err, rows) => {
      if (err) {
        rej(err);
      } else {
        res(rows);
      }
    });
  });
  if (row) {
    res.status(200).send("Account succesfully created!");
  } else {
    res.status(409).send("Failed to create account.");
  }
});

app.post("/delete/username", async (req, res) => {
  console.log("here in delete/username");
  const { username } = req.body;
  console.log("this is username in the delete account page: " + username);
  const row = await authenticateUsernamePromise(db, username);
  if (row) {
    console.log("user is in database");
    res.status(200).send("username is in database");
  } else {
    console.log("user is NOT in database");
    res.status(404).send("username is not in database");
  }
});
app.post("/delete/password", async (req, res) => {
  console.log("here in delete/password");
  const { username, password } = req.body;
  console.log("this is username in the delete account page: " + username);
  console.log("this is password in the delete account page: " + password);
  const { salt } = await getSaltPromise(db, username);
  // console.log(salt);
  const passwordAndSaltHash = await hashPasswordWithSalt(password, salt);
  const row = await authenticateUsernameAndPasswordPromise(
    db,
    username,
    passwordAndSaltHash
  );
  if (row) {
    console.log("user and password are in database");
    res.status(200).send("username and password are in database");
    const deletedRow = await deleteRecordPromise(db, username);
    console.log(deletedRow);
    console.log("user account was deleted");
  } else {
    console.log("user and password are NOT in database");
    res.status(404).send("username and password are not in database");
  }
});

app.post("/upload-image", upload.single("image"), async (req, res) => {
  const file = req.file;

  try {
    await uploadFile(file);
    res.status(200).send("Image uploaded successfully to S3 bucket");
  } catch (e) {
    console.log("Error message: " + e);
    res.status(500).send("failed to upload image");
  }
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});

const generateSalt = async () => {
  const salt = await bcrypt.genSalt(10);
  return salt;
};

const hashPasswordWithSalt = async (password, salt) => {
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
