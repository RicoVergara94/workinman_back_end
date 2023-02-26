const express = require("express");
const { Readable } = require("stream");
const csv = require("csv-parser");
const fs = require("fs");
const util = require("util");
const unlinkFile = util.promisify(fs.unlink);
const cors = require("cors");
const bodyParser = require("body-parser");
const { urlencoded } = require("express");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const multer = require("multer");
const sharp = require("sharp");
const { uploadFile, getFileStream, getImageUrls } = require("./s3");
const http = require("http");
const WebSocket = require("ws");
const { WebSocketServer } = require("ws");

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

  if (!usernameData) {
    res.status(404).send("the username is invalid");
    return;
  }
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
  const { username } = req.body;
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
  const { username, password } = req.body;
  const { salt } = await getSaltPromise(db, username);
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

    console.log("user account was deleted");
  } else {
    console.log("user and password are NOT in database");
    res.status(404).send("username and password are not in database");
  }
});

app.post("/upload-image", upload.single("image"), async (req, res) => {
  const file = req.file;
  const username = req.body.username;
  if (!req.file) {
    res.status(400).send("image failed to upload");
    return;
  }
  const resImageName = req.file.originalname;
  const imageName = req.file.originalname;
  const encryptedImageName = hashImageNameAndUsername(imageName, username);
  req.file.originalname = encryptedImageName;
  const buffer = await sharp(file.buffer)
    .resize({ height: 279, width: 446, fit: "contain" })
    .toBuffer();

  file.buffer = buffer;
  try {
    await uploadFile(file);
    res.status(200).send(`${resImageName} uploaded successfully!`);
  } catch (e) {
    console.log("Error message: " + e);
    res.status(500).send("failed to upload image");
  }
});

app.post("/upload-csv", upload.single("csvFile"), async (req, res) => {
  const tempResults = [];
  const username = req.body.username;
  const bufferStream = new Readable();
  if (!req.file) {
    res.status(400).send("csv file failed to upload");
    return;
  }
  bufferStream.push(req.file.buffer);
  bufferStream.push(null);
  await bufferStream
    .pipe(csv())
    .on("data", (data) => tempResults.push(data))
    .on("end", () => {});

  const results = tempResults.map((e) => {
    return {
      "Question ID": Object.values(e)[0],
      "Question Text": Object.values(e)[1],
      "Correct Answer": Object.values(e)[2],
      "Incorrect Answer 1": Object.values(e)[3],
      "Incorrect Answer 2": Object.values(e)[4],
      "Incorrect Answer 3": Object.values(e)[5],
      "Difficulty Level": Object.values(e)[6],
      "Image File Name": Object.values(e)[7],
    };
  });
  await putCsvRecordsIntoQuestionTable(results, username, db);
  res.status(200).send("file uploaded successfully");
});

app.get("/get-game", async (req, res) => {
  const username = req.query.username;

  const records = await getImageUrls(username, db);
  if (records) {
    res.status(200).send(records);
  }
});

const server = app.listen(PORT, () => {
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

const hashImageNameAndUsername = (imageName, username) => {
  return crypto.createHash("sha256").update(imageName, username).digest("hex");
};

const putCsvRecordsIntoQuestionTable = async (
  recordArray,
  username,
  database
) => {
  for (const record of recordArray) {
    let {
      "Question ID": questionId,
      "Question Text": questionText,
      "Correct Answer": correctAnswer,
      "Incorrect Answer 1": incorrectAnswer1,
      "Incorrect Answer 2": incorrectAnswer2,
      "Incorrect Answer 3": incorrectAnswer3,
      "Difficulty Level": difficultyLevel,
      "Image File Name": imageFileName,
    } = record;
    imageFileName = hashImageNameAndUsername(imageFileName, username);
    const query = `INSERT INTO questions (username, question_id, question_text, correct_answer, incorrect_answer1, incorrect_answer2, incorrect_answer3, difficulty_level, image_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`;
    try {
      await database.run(query, [
        username,
        questionId,
        questionText,
        correctAnswer,
        incorrectAnswer1,
        incorrectAnswer2,
        incorrectAnswer3,
        difficultyLevel,
        imageFileName,
      ]);
      console.log("Record inserted successfully");
    } catch (err) {
      console.error(`Error inserting record: ${JSON.stringify(record)}`);
      console.error(err);
    }
  }
};

// db.all("select * from users;", [], (err, rows) => {
//   if (err) {
//     console.log(err);
//   } else {
//     console.log(rows);
//   }
// });
// db.all("select * from questions;", [], (err, rows) => {
//   if (err) {
//     console.log(err);
//   } else {
//     console.log(rows);
//   }
// });

// db.all(
//   "SELECT name FROM sqlite_master WHERE type='table'",
//   [],
//   (err, tables) => {
//     console.log(tables);
//   }
// );
const wss = new WebSocketServer({ server: server, path: "/ws" });

wss.on("connection", function connection(ws, req) {
  ws.on("error", console.error);

  ws.on("message", function message(data, isBinary) {
    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data, { binary: isBinary });
        // console.log(data.toString());
      }
    });
  });
});
