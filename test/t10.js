var Trial = require('../index').Trial;

var trial = new Trial();
trial.load(__dirname + "/t10");
trial.on('load', function() { trial.run(); });
trial.on('start_test', function(trial, test) {
  console.log('start ' + test.file)
});
trial.on('complete_test', function(trial, test) {
  console.log('complete ' + test.file)
});
