const express = require("express");
const path = require("path");

const app = express();
const port = 8080;

app.use("/assets", express.static("assets"), (req, res) => res.sendFile(path.resolve("./dev/index.html")));
app.use("/", express.static("dev"));

app.listen(port);

console.log(`Development server listening on port ${port}`);