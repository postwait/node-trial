var xml = require('xml'),
    fs = require('fs');

var Junit = function(trial, filename) {
  this.filename = filename || "test_detail.xml";
  this.trial =  trial;
  this.testsuites = {}
  var self = this;
  trial.on('load', function() {
    var args = Array.prototype.slice.call(arguments);
    self.load.apply(self, args);
  });
  trial.on('provides', function() {
    var args = Array.prototype.slice.call(arguments);
    self.provides.apply(self, args);
  });
  trial.on('start_test', function() {
    var args = Array.prototype.slice.call(arguments);
    self.start_test.apply(self, args);
  });
  trial.on('progress', function() {
    var args = Array.prototype.slice.call(arguments);
    self.progress.apply(self, args);
  });
  trial.on('complete_test', function() {
    var args = Array.prototype.slice.call(arguments);
    self.complete_test.apply(self, args);
  });
  trial.on('start', function() {
    var args = Array.prototype.slice.call(arguments);
    self.start.apply(self, args);
  });
  trial.on('complete', function() {
    var args = Array.prototype.slice.call(arguments);
    self.complete.apply(self, args);
  });
}

Junit.prototype.load = function() { }
Junit.prototype.provides = function() { }
Junit.prototype.start_test = function(trial, test) {
  var name = test.file + ":" + test.name;
  this.alltests[0]._attr.tests += test.plan;
  if(!this.testsuites.hasOwnProperty(name)) {
    this.testsuites[name] = {
      start_time: process.hrtime(),
      testsuite: [ { _attr: { 
        name: name,
	tests: test.plan,
        errors: 0,
        failures: 0,
        skip: 0,
        time: 0,
        timestamp: new Date().toISOString()
      } } ]
    }
  }
}
Junit.prototype.progress = function(trial, test, msg, status) {
  var name = test.file + ":" + test.name;
  var ts = this.testsuites[name];
  var testcase = { testcase: { _attr: { name: msg.name, classname: test.name } } };
  if(status == 'failure') {
    ts.testsuite[0]._attr.failures++;
    this.alltests[0]._attr.failures++;
  }
  if(status == 'skipped') {
    ts.testsuite[0]._attr.skip++;
    this.alltests[0]._attr.skip++;
  }
  ts.testsuite.push(testcase);
}
Junit.prototype.complete_test = function(trial, test) {
  var name = test.file + ":" + test.name;
  var ts = this.testsuites[name];
  var ms = process.hrtime(ts.start_time)[1] / 1000000.0
  ts.testsuite[0]._attr.time = ms;
}
Junit.prototype.start = function(trial) {
  this.start_time = process.hrtime();
  this.alltests = [ { _attr: {
    tests: 0, errors: 0, failures: 0, skip: 0, time: 0
  } } ]
}
Junit.prototype.complete = function(status) {
  var ms = process.hrtime(this.start_time)[1] / 1000000.0
  this.alltests[0]._attr.time = ms;
  for (var key in this.testsuites) {
    this.alltests.push({ testsuite: this.testsuites[key].testsuite });
  }
  fs.writeFileSync(this.filename, 
                   xml({testsuites: this.alltests}, {indent: true}) + "\n");
}

module.exports = Junit;
