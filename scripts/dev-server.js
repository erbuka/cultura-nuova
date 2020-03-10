const express = require("express");
const path = require("path");

const app = express();
const port = 8080;

app.use("/assets", express.static("assets"), (req, res) => res.sendFile(path.resolve("./build-dev/index.html")));
app.use("/", express.static("build-dev"));

app.listen(port);

console.log(`Development server listening on port ${port}`);