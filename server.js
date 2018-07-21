const express = require("express");
const opn = require("opn");
const path = require("path");

const PORT = process.env.PORT || 8080;

const app = express();
app.use(express.static(__dirname + "/build"));
app.listen(PORT);

console.log("Server attivo all'indirizzo:", `http://127.0.0.1:${PORT}`);
opn(`http://127.0.0.1:${PORT}`);
