const mongoose = require("mongoose");
const express = require("express");
const app = express();

require("dotenv").config();

//db
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true })
  .then(() => {
    console.log("DB Connected");
  })
  .catch(() => {
    console.log("Lado");
  });

mongoose.connection.on("error", (err) => {
  console.log(`DB connection error: ${err.message}`);
});

app.get("/", (req, res) => {
  res.send("Hello from node");
});

const port = process.env.PORT || 8000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
