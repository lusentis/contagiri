const express = require("express");
const open = require("open");
const path = require("path");

const PORT = process.env.PORT || 8080;

const app = express();
app.use(express.static(__dirname + "/build"));
app.listen(PORT);

console.log("Server ready on", `http://127.0.0.1:${PORT}`);
open(`http://127.0.0.1:${PORT}`);
