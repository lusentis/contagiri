
const serve = require('serve');
const open = require('open');
const path = require('path');

const PORT = process.env.PORT || 8080;

serve(path.join(__dirname, 'build'), {
  port: PORT,
  ignore: ['node_modules']
});

open(`http://127.0.0.1:${PORT}`);
