var browserify = require('browserify');



var b = browserify({
  paths: [
    __dirname + '/src'
  ]
}, {
  debug: true
});
b.plugin('tsify');
b.add(__dirname + '/src/index.js');
b.bundle().pipe(process.stdout);

