const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { urlencoded } = require("express");
const app = express();

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
  // console.log("this is username: " + username);
  // console.log("this is password: " + password);
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
