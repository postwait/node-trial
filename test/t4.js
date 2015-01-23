var Test = require('../index').Test,
    Trial = require('../index').Trial;

var t1 = new Test(function() {
  console.log("Starting Test 1");
  this.ok(true, "postponed test");
  this.is(this.fetch("magic2"), 2, "provider's results");
}, { name: "test 1 (runs later)", plan: 2, requires: ['test2'] });

var t2 = new Test(function() {
  console.log("Starting Test 2");
  var test = t2;
  this.ok(true, "ok test");
  setTimeout(function() {
    test.stash("magic2", 2); 
    test.ok(true, "sorry I'm late");
  }, 1000);
}, { name: 'Hello', plan: 2, provides: ['test2'] });

var trial = new Trial({ verbose: process.env.VERBOSE });
trial.add(t1);
trial.add(t2);
trial.run();
