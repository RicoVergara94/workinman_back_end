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
  // edit the images with dependency
  // console.log(req.body.username);
  // we need to encrypt the username with the originalname
  const username = req.body.username;

  const imageName = req.file.originalname;
  const encryptedImageName = hashImageNameAndUsername(imageName, username);
  // console.log(encryptedImageName);

  req.file.originalname = encryptedImageName;
  console.log(req.file);
  try {
    await uploadFile(file);
    res.status(200).send("Image uploaded successfully!");
  } catch (e) {
    console.log("Error message: " + e);
    res.status(500).send("failed to upload image");
  }
});

app.post("/upload-csv", upload.single("csvFile"), async (req, res) => {
  // const csvContent = req.file.buffer.toString();
  // console.log(csvContent);
  // we need to get the username included in the request body

  const results = [];
  const username = req.body.username;
  const bufferStream = new Readable();
  bufferStream.push(req.file.buffer);
  bufferStream.push(null);
  await bufferStream
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", () => {
      // console.log(results);
    });

  // console.log(results);

  // need to put the data into the table
  // bring in the username from the client
  await putCsvRecordsIntoQuestionTable(results, username, db);
  console.log("before the table function");
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

const hashImageNameAndUsername = (imageName, username) => {
  return crypto.createHash("sha256").update(imageName, username).digest("hex");
};

const putCsvRecordsIntoQuestionTable = async (
  recordArray,
  username,
  database
) => {
  console.log("inside heyuh");
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
    console.log("this is questionId: " + questionId);
    console.log("this is questionText: " + questionText);
    console.log("this is correctAnswer: " + correctAnswer);
    console.log("this is incorrectAnswer1: " + incorrectAnswer1);
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

// const putCsvRecordsIntoQuestionTable = async (
//   recordArray,
//   username,
//   database
// ) => {
//   console.log("inside heyuh");
//   // console.log(recordArray);
//   for (const record of recordArray) {
//     const {
//       "Question ID": questionId,
//       "Question Text": questionText,
//       "Correct Answer": correctAnswer,
//       "Incorrect Answer 1": incorrectAnswer1,
//       "Incorrect Answer 2": incorrectAnswer2,
//       "Incorrect Answer 3": incorrectAnswer3,
//       "Difficulty Level": difficultyLevel,
//       "Image File Name": imageFileName,
//     } = record;
//     console.log("this is questionId: " + questionId);
//     console.log("this is questionText: " + questionText);
//     console.log("this is correctAnswer: " + correctAnswer);
//     console.log("this is incorrectAnswer1: " + incorrectAnswer1);
//     const query = `INSERT INTO questions (username, question_id, question_text, correct_answer, incorrect_answer1, incorrect_answer2, incorrect_answer3, difficulty_level, image_name) VALUES ('${username}', '${questionId}', '${questionText}', '${correctAnswer}', '${incorrectAnswer1}', '${incorrectAnswer2}', '${incorrectAnswer3}', '${difficultyLevel}', '${imageFileName}');`;
//     try {
//       await database.get(query);
//       // console.log("inside the try in wakanda");
//     } catch (err) {
//       console.error(`Error inserting record: ${JSON.stringify(record)}`);
//       console.error(err);
//     }
//   }
// };

// const putCsvRecordsIntoQuestionTable = async (
//   recordArray,
//   username,
//   database
// ) => {
//   recordArray.forEach((record) => {
//     const {
//       questionId,
//       questionText,
//       correctAnswer,
//       incorrectAnswer1,
//       incorrectAnswer2,
//       incorrectAnswer3,
//       difficultyLevel,
//       imageFileName,
//     } = record;
//     console.log("this is questionId: " + questionId);
//     console.log("this is questionText: " + questionText);
//     console.log("this is correctAnswer: " + correctAnswer);
//     console.log("this is incorrectAnswer1: " + incorrectAnswer1);
//     const query = `INSERT INTO questions (username, question_id, question_text, correct_answer, incorrect_answer1, incorrect_answer2, incorrect_answer3, difficulty_level, image_name) VALUES ('${username}', '${questionId}', '${questionText}', '${correctAnswer}', '${incorrectAnswer1}', '${incorrectAnswer2}', '${incorrectAnswer3}', '${difficultyLevel}', '${imageFileName}');`;
//     const result = new Promise((res, rej) => {
//       database.get(query, [], (err, row) => {
//         if (err) {
//           rej(err);
//         } else {
//           res(row);
//         }
//       });
//     });
//   });
// };

// const insertUsernamePasswordSaltPromise = async (
//   db,
//   username,
//   hashedPasswordWithSalt,
//   salt
// ) => {
//   const query = `INSERT INTO users (username, password, salt) VALUES ('${username}', '${hashedPasswordWithSalt}', '${salt}');`;
//   return new Promise((res, rej) => {
//     db.get(query, [], (err, row) => {
//       if (err) {
//         rej(err);
//       } else {
//         res(row);
//       }
//     });
//   });
// };

// db.all("select * from users;", [], (err, rows) => {
//   if (err) {
//     console.log(err);
//   } else {
//     console.log(rows);
//   }
// });
db.all("select * from questions;", [], (err, rows) => {
  if (err) {
    console.log(err);
  } else {
    console.log(rows);
  }
});

// db.all(
//   "SELECT name FROM sqlite_master WHERE type='table'",
//   [],
//   (err, tables) => {
//     console.log(tables);
//   }
// );
