var Trial = require('../index').Trial;

var trial = new Trial({"max_concurrency": 1});
trial.load(__dirname + "/t11");
trial.on('load', function() { trial.run(); });
concurrent = 0;
max_concurrent = 0;
trial.on('start_test', function(trial, test) {
  console.log('start ' + test.file)
  concurrent++;
  if (concurrent > max_concurrent) max_concurrent = concurrent;
});
trial.on('complete_test', function(trial, test) {
  console.log('complete ' + test.file)
  concurrent--;
});
trial.on('complete', function() {
  if (max_concurrent != 1) process.exit(1);
});