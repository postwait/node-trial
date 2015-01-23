var Test = require('../index').Test,
    Trial = require('../index').Trial;

var t1 = new Test(function() {
  this.ok(true, "ok test");
  this.is(1+2, 3, "is test");
  this.isnt(2+2, 3, "isn't test");
  this.like("food", /o{2}/, "like test");
  this.unlike("fewd", /o{2}/, "unlike test");
}, { name: 'Hello', plan: 5 });

var trial = new Trial();
trial.add(t1);
trial.run();
