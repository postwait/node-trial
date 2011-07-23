var sys = require('sys'),
    fs = require('fs'),
    vm = require('vm'),
    events = require('events'),
    Test, Trial,
    BRIEF_NAME_LEN = 60,
    longspace = '                                                      ' +
                '                                                      ',
    bail = function(msg) {
      console.log("-------- FATAL ----------");
      console.log(msg);
      process.exit(2);
    };

Test = function(job, params) {
  if(typeof(job) === "object") {
    params = job;
    this.job = params.job;
  }
  else this.job = job;
  this.state = Test.CONFIGURED;
  this.todo = 0;
  this.successes = 0;
  this.failures = 0;
  this.skips = 0;
  this.lines = [];
  this.linestatus = [];
  this.requires = {};
  this.satisfied = {};
  this.provides = {};
  this.name = "Unnamed test.";
  if('name' in params) this.name = params.name;
  if('file' in params) this.file = params.file;
  else this.file = __filename.substring(__dirname.length+1);
  this.file = this.file.replace(/\.t?js/, "");

  var cwd = process.cwd();
  if(cwd == this.file.substring(0, cwd.length))
    this.file = this.file.substring(cwd.length+1);

  if(params.plan) this.plan = params.plan;
  if(this.plan <= 0)
    bail("Tried to create Test '" + this.name + "' with no plan");
  this.todo = this.plan;

  if(params.requires)
    for(var i=0; i<params.requires.length; i++)
      this.requires[params.requires[i]] = true;

  if(params.provides)
    for(var i=0; i<params.provides.length; i++)
      this.provides[params.provides[i]] = true;
}
sys.inherits(Test, events.EventEmitter);

Test.CONFIGURED = 0;
Test.WAITING = 1;
Test.RUNNING = 2;
Test.FINISHED = 3;

function bname(n) {
  if(n.length > BRIEF_NAME_LEN) n = n.substring(0,BRIEF_NAME_LEN);
  else if(n.length < BRIEF_NAME_LEN)
    n = n + longspace.substring(0, BRIEF_NAME_LEN - n.length);
  return n;
}
Test.prototype.brieflog = function() {
  var n = bname("  " + this.file +": "+ this.name);
  console.log(n + "     " + this.successes + "+" + this.skips +
              "+" + this.failures + "/" + this.plan);
}
Test.prototype.log = function() {
  var detail, i, n = bname("  " +  this.file +": "+ this.name);
  console.log(n);
  for(i=0; i<this.lines.length; i++)
    console.log(bname("    " + this.lines[i]) +
                " ..." + this.linestatus[i]);
  if(this.todo) console.log("    " + this.todo + " test(s) unfinished.");
}

Test.prototype.succeed = function(msg) {
  this.todo--;
  this.successes++;
  this.lines.push(msg);
  this.linestatus.push('success');
  this.emit('progress', this, msg, 'success');
  this.possiblyComplete();
}

Test.prototype.fail = function(msg) {
  this.todo--;
  this.failures++;
  this.lines.push(msg);
  this.linestatus.push('failure');
  this.emit('progress', this, msg, 'failure');
  this.possiblyComplete();
}

Test.prototype.skip = function(msg) {
  this.todo--;
  this.skips++;
  this.lines.push(msg);
  this.linestatus.push('skipped');
  this.emit('progress', this, msg, 'skipped');
  this.possiblyComplete();
}
Test.prototype.ok = function(v, msg) {
  if(v) this.succeed(msg);
  else this.fail(msg);
}
Test.prototype.is = function(a,b,msg) {
  if(a == b) this.succeed(msg);
  else this.fail(msg);
}

Test.prototype.stash = function(key, value) {
  if(!('trial' in this)) bail("stash used before test placed in trial");
  this.trial.stash(key,value);
}

Test.prototype.fetch = function(key) {
  if(!('trial' in this)) bail("fetch used before test placed in trial");
  return this.trial.fetch(key);
}

Test.prototype.possiblyComplete = function() {
  if(this.todo < 0)
    bail("Test '" + this.name + "' just finished more tests than planned");
  if(this.todo == 0) {
    for (var name in this.provides)
      this.emit('provides', this, name);
    this.state = Test.FINISHED;
    this.emit('complete', this);
  }
}

Test.prototype.addToTrial = function(trial) {
  if('trial' in this)
    bail("Test '" + this.name + "' cannot be added to more than one trial");
  this.trial = trial;
}
Test.prototype.hasRequires = function() {
  var cnt = 0;
  for (var item in this.requires) { cnt++; break; }
  return (cnt>0) ? true : false;
}
Test.prototype.setProvides = function(target) {
  for (var item in this.provides) {
    if(!(item in target)) target[item] = [];
    target[item].push(this);
  }
}
Test.prototype.getRequires = function() {
  var r = [];
  for (var item in this.requires) r.push(item);
  return r;
}

Test.prototype.run = function() {
  if(!('trial' in this))
    bail("Test '" + this.name + "' attempted that is not part of a trial");
  var hasr = this.hasRequires();
  if(hasr && this.state == Test.CONFIGURED)
    this.state = Test.WAITING;
  if(!hasr && (this.state == Test.WAITING ||
               this.state == Test.CONFIGURED)) {
    this.state = Test.RUNNING;
    this.job();
  }
}

Trial = function(params) {
  params = params || {};
  this._stash = {};
  this.should_exit = false;
  this.total_tests = 0;
  this.tests_todo = 0;
  this.tests_to_run = [];
  this.tests_complete = [];
  if(params.verbose) this.verbose = params.verbose;
  if(!('verbose' in this)) this.verbose = process.env.TEST_VERBOSE;
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
            if(s.isDirectory()) trailload(dir+"/"+file);
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

  if(trial.lifeline_timer) clearTimeout(trial.lifeline_timer);
  if(trial.premature) process.removeListener('exit', trial.premature);
  if(trial.premature) process.removeListener('SIGHUP', trial.premature);
  delete trial["premature"];
  if(trial.should_exit) trial._exit();
}

Trial.prototype.report = function() {
  var hdr, i;
  console.log("\n== Trial Report ==");
  // Successes
  hdr = 0;
  for(i=0; i<this.total_tests; i++) {
    var test = this.tests_complete[i];
    if(test != null && test.failures == 0 && test.skips == 0) {
      if(!hdr++) console.log(" === PERFECT TESTS ===");
      if(this.verbose) test.log();
      else test.brieflog();
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
  process.addListener('SIGHUP', trial.premature);
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
Trial.prototype.exit = function() {
  this.should_exit = true;
}
Trial.prototype.stash = function(key, value) {
  this._stash[key] = value;
}
Trial.prototype.fetch = function(key) {
  return this._stash[key];
}


exports.Test = Test;
exports.Trial = Trial;
