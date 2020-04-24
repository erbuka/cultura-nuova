const express = require("express");
const path = require("path");
const fs = require("fs");
const rimraf = require("rimraf");

const app = express();
const port = 8080;

app.delete("/assets/*", (req, res) => {
    let dirPath = path.resolve(path.join("./", req.url));

    if (fs.lstatSync(dirPath).isDirectory()) {
        let files = path.join(dirPath, "*");
        rimraf(files, (error) => {
            if (error) {
                res.statusCode = 400;
                res.send(error);
            } else {
                res.statusCode = 200;
                res.send(dirPath);
            }
        });
    } else {
        res.statusCode = 400;
        res.send(`Not a valid directory: ${dirPath}`);
    }

});

app.post("/assets/*", express.raw({ type: ["text/html", "application/octet-stream"], limit: "100mb" }), (req, res, next) => {
    let filePath = path.resolve(path.join("./", req.url));
    fs.writeFile(filePath, req.body, () => {
        res.statusCode = 200;
        res.send();
    });
});
app.use("/assets", express.static("assets"), (req, res) => {
    res.sendFile(path.resolve("./build-dev/index.html"))
});
app.use("/", express.static("build-dev"));

app.listen(port);

console.log(`Development server listening on port ${port}`);