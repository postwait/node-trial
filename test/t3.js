var Test = require('../index').Test,
    Trial = require('../index').Trial;

var t1 = new Test(function() {
  this.ok(true, "postponed test");
}, { name: "test 1 (runs later)", plan: 1, requires: ['test2'] });

var t2 = new Test(function() {
  var test = t2;
  this.ok(true, "ok test");
  setTimeout(function() { test.ok(true, "sorry I'm late"); }, 1000);
}, { name: 'Hello', plan: 2, provides: ['test2'] });

var trial = new Trial({ verbose: process.env.VERBOSE });
trial.add(t1);
trial.add(t2);
trial.run();
