var browserify = require('browserify');
var b = browserify({
  paths: [
    __dirname + '/src'
  ]
});

b.add(__dirname + '/src/index.js');
b.bundle().pipe(process.stdout);