var Test = require('../index').Test,
    Trial = require('../index').Trial;

var t1 = new Test(function() {
  this.ok(true, "ok test");
}, { name: 'Hello', plan: 2 });

var trial = new Trial({ verbose: process.env.VERBOSE });
trial.add(t1);
trial.run();

setTimeout(function() { process.kill(process.pid, 'SIGINT'); }, 2000);
