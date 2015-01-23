var Test = require('../index').Test,
    Trial = require('../index').Trial;

var t1 = new Test(function() {
  this.skip("skip test");
}, { name: 'Skippy', plan: 1 });

var trial = new Trial();
trial.add(t1);
trial.run();
