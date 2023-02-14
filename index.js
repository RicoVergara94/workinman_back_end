const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { urlencoded } = require("express");
const app = express();
// import { db, runQueries } from "./workinman_db";
const { db, runQueries } = require("./workinman_db");

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
  const queries = [
    `
  select username from users where username = '${username}';
  `,
    `
  select password from users where password = '${password}';
  `,
  ];
  runQueries(db, queries);
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
