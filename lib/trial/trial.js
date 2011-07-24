/*
 * Copyright (c) 2011, OmniTI Computer Consulting, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 * 
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 *       copyright notice, this list of conditions and the following
 *       disclaimer in the documentation and/or other materials provided
 *       with the distribution.
 *     * Neither the name OmniTI Computer Consulting, Inc. nor the names
 *       of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written
 *       permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

var sys = require('sys'),
    fs = require('fs'),
    vm = require('vm'),
    events = require('events'),
    Test = require('./test'),
    Trial,
    bail = function(msg) {
      console.log("-------- FATAL ----------");
      console.log(msg);
      process.exit(2);
    };

Trial = function(params) {
  params = params || {};
  this._stash = {};
  this.should_exit = true;
  this.total_tests = 0;
  this.tests_todo = 0;
  this.tests_to_run = [];
  this.tests_complete = [];
  if(params.verbose) this.verbose = params.verbose;
  if(!('verbose' in this)) this.verbose = process.env.TEST_VERBOSE;
  if(!('brief' in this)) this.brief = process.env.TEST_BRIEF;
  if(!this.verbose && !this.brief) this.summary = true;
  if(!('summary' in this)) this.summary = process.env.TEST_SUMMARY;
};
sys.inherits(Trial, events.EventEmitter);

Trial.prototype.load = function(dir) {
  var trial = this;
  var cnt = 0;
  var origdir = dir;
  var trialload = function(dir) {
    cnt++;
    fs.readdir(dir, function(err, files) {
      if(err) bail("Cannot read trial from " + dir + ": " + err);
      for(var i=0; i<files.length; i++) {
        var file = files[i];
        (function(file,dir) {
          cnt++;
          fs.lstat(dir+"/"+file, function(err, s) {
            if(err) bail("stat("+dir+"/"+file+") failed: " + err);
            if(s.isDirectory()) trialload(dir+"/"+file);
            else if(s.isFile()) {
              if(file.substring(0,1) != "." &&
                 file.substring(file.length-4) === ".tjs") {
                cnt++;
                fs.readFile(dir+"/"+file, 'utf8', function(err, data) {
                  if(err) bail("Cannot read file "+dir+"/"+file+": " + err);
                  var ctx = { plan: 1, file: dir+"/"+file };
                  try {
                    var tobj = vm.runInNewContext(data, ctx, file);
                  }
                  catch(e) {
                    console.log(e.stack);
                    bail("Javascript error in: " + dir+"/"+file);
                  }
                  trial.add(new Test(ctx));
                  cnt--;
                  if(cnt == 0) trial.emit('load', origdir);
                });
              }
            }
            cnt--;
            if(cnt == 0) trial.emit('load', origdir);
          });
        })(file,dir);
      }
      cnt--;
      if(cnt == 0) trial.emit('load', origdir);
    });
  };
  trialload(dir);
}
function completeTrial(trial) {
  if(trial.customReport) trial.customReport(trial);
  else trial.report();

  if(trial.premature) process.removeListener('exit', trial.premature);
  if(trial.premature) process.removeListener('SIGINT', trial.premature);
  delete trial["premature"];
  if(trial.should_exit) trial._exit();
  if(trial.lifeline_timer) clearTimeout(trial.lifeline_timer);
}

Trial.prototype.report = function() {
  var hdr, i, counts = [0,0,0,0];
  console.log("\n== Trial Report ==");
  for(i=0; i<this.total_tests; i++) {
    var test = this.tests_complete[i] || this.tests_to_run[i];
    counts[0] += test.plan;
    counts[1] += test.successes;
    counts[2] += test.skips;
    counts[3] += test.failures;
  }
  if(this.verbose || this.brief) {
    // Successes
    hdr = 0;
    for(i=0; i<this.total_tests; i++) {
      var test = this.tests_complete[i];
      if(test != null && test.failures == 0 && test.skips == 0) {
        if(!hdr++) console.log(" === PERFECT TESTS ===");
        if(this.verbose) test.log();
        else if(this.brief) test.brieflog();
      }
    }
    // Skips
    hdr = 0;
    for(i=0; i<this.total_tests; i++) {
      var test = this.tests_complete[i];
      if(test != null && test.failures == 0 && test.skips != 0) {
        if(!hdr++) console.log(" === TESTS WITH SKIPS ===");
        if(this.verbose) test.log();
        else test.brieflog();
      }
    }
    // Failures
    hdr = 0;
    for(i=0; i<this.total_tests; i++) {
      var test = this.tests_complete[i];
      if(test != null && test.failures != 0) {
        if(!hdr++) console.log(" === FAILING TESTS ===");
        if(this.verbose) test.log();
        else test.brieflog();
      }
    }
    // Unfinished
    hdr = 0;
    for(i=0; i<this.total_tests; i++) {
      var test = this.tests_to_run[i];
      if(test != null) {
        if(!hdr++) console.log(" === UNFINISHED TESTS ===");
        if(this.verbose) test.log();
        else test.brieflog();
      }
    }
  }
  if(this.summary) {
    console.log(" Total tests: " + this.total_tests);
    if(this.tests_todo)
      console.log(" Tests unfinished: " + this.tests_todo);
    console.log(" Total planned: " + counts[0]);
    console.log(" Total succeeeded: " + counts[1]);
    console.log(" Total skipped: " + counts[2]);
    console.log(" Total failed: " + counts[3]);
  }
}

Trial.prototype.auditDependencies = function() {
  var error = false, all_provides = {};
  for(var i=0;i<this.total_tests;i++) {
    var test = this.tests_complete[i] || this.tests_to_run[i];
    test.setProvides(all_provides);
  }
  for(var p in all_provides) {
    if(all_provides[p].length > 1) {
      console.log("WARNING: more than one test provides '"+p+"'");
      for(var i=0; i<all_provides[p].length; i++) {
        console.log("    required by: " + all_provides[p][i].file +": "+
                    all_provides[p][i].name);
      }
    }
  }
  for(var i=0;i<this.total_tests;i++) {
    var test = this.tests_complete[i] || this.tests_to_run[i];
    var reqs = test.getRequires();
    for (var j=0; j<reqs.length; j++) {
      if(!(reqs[j] in all_provides)) {
        error = true;
        console.log("ERROR: "+test.file+": "+test.name+" needs '"+
                    reqs[j]+"'");
      }
    }
  }
  if(error) bail("Cannot run tests with unresolved requires");
}
Trial.prototype.checkRunDependencies = function()  {
  var states = [0,0,0,0];
  for(var i=0;i<this.total_tests;i++) {
    var test = this.tests_complete[i] || this.tests_to_run[i];
    states[test.state]++;
  }
  if(states[Test.WAITING] > 0 &&
     states[Test.RUNNING] == 0) {
    bail("We have waiting tests, but no tests are running.");
  }
}
Trial.prototype.add = function(test) {
  var trial = this;
  test.addToTrial(trial);
  test.on('provides', function(test, name) {
    trial.emit('provides', test, name);
  });
  if(test.hasRequires()) {
    this.on('provides', function(objecttest, name) {
      if(name in test.requires) {
        test.satisfied[name] = true;
        delete test.requires[name];
      }
      test.run();
    });
  }
  var idx = trial.total_tests++;
  trial.tests_todo++;
  trial.tests_to_run[idx] = test;
  test.on('progress', function(test, msg, status) {
    trial.emit('progress', trial, test, msg, status);
  });
  test.on('complete', function() {
    trial.checkRunDependencies();
    trial.tests_complete[idx] = test;
    trial.tests_to_run[idx] = null;
    trial.tests_todo--;
    if(trial.tests_todo == 0)
      completeTrial(trial);
  });
};

Trial.prototype.run = function(report) {
  var trial = this;
  trial.auditDependencies();
  var lifeline = function() {
    trial.lifeline_timer = setTimeout(lifeline, 1000);
  };
  lifeline();
  trial.customReport = report;
  trial.premature = function() {
    console.log("!!! Premature trial exit... Reporting. !!!");
    completeTrial(trial);
  };
  process.addListener('exit', trial.premature);
  process.addListener('SIGINT', trial.premature);
  if(trial.tests_todo == 0)
    completeTrial(trial);
  for (var i=0; i<trial.total_tests; i++)
    trial.tests_to_run[i].run();
};
Trial.prototype._exit = function() {
  for(var i=0; i<this.total_tests; i++) {
    if(this.tests_complete[i] == null ||
       this.tests_complete[i].state != Test.FINISHED ||
       this.tests_complete[i].failures > 0) {
      console.log("not ok");
      process.exit(1);
    }
  }
  console.log("ok");
  process.exit(0);
}
Trial.prototype.noexit = function() {
  this.should_exit = false;
}
Trial.prototype.stash = function(key, value) {
  this._stash[key] = value;
}
Trial.prototype.fetch = function(key) {
  return this._stash[key];
}

module.exports = Trial;
