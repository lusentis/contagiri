import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import "./index.css";
import "./vendor/pure-min.css";
import registerServiceWorker from "./registerServiceWorker";

ReactDOM.render(<App />, document.getElementById("root"));
registerServiceWorker();

console.log("App started");
