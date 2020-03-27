const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const port = 8080;

app.post("/assets/*", express.raw({ type: ["text/html", "application/octet-stream"] }), (req, res, next) => {
    let filePath = path.resolve(path.join("./", req.url));
    fs.writeFileSync(filePath, req.body);
    res.statusCode = 200;
    res.send();
});
app.use("/assets", express.static("assets"), (req, res) => {
    res.sendFile(path.resolve("./build-dev/index.html"))
});
app.use("/", express.static("build-dev"));

app.listen(port);

console.log(`Development server listening on port ${port}`);