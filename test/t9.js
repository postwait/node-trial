var Test = require('../index').Test,
    Trial = require('../index').Trial;

var input = {
  a: { b: [1,{ t: [1,2,3,4,5,{s:true}]
             },
           3,4,"hahaha"], c: true },
  d: 1,
  e: null,
  f: "fruit"
}, output = {
  a: { b: [1,{ t: [1,2,3,4,5,{s:false}]
             },
           3,4,"hahaha"], c: true },
  d: 1,
  e: null,
  f: "fruit"
};


var t1 = new Test(function() {
  this.is_deeply(input, output, "deeply test");
}, { name: 'Hello', plan: 1 });

var trial = new Trial({ verbose: process.env.VERBOSE });
trial.add(t1);
trial.run();
