const express = require("express");
const cors = require("cors");
const app = express();

const PORT = 3232;

// const corsOptions = {
//   origin: "https://example.com",
// };

app.use(cors());
app.get("/", (req, res) => {
  res.send("Hello World");
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
