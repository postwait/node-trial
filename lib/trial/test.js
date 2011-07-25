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
    events = require('events'),
    Test,
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
Test.prototype.not_ok = function(v, msg) {
  if(!v) this.succeed(msg);
  else this.fail(msg);
}
Test.prototype.is = function(a,b,msg) {
  if(a == b) this.succeed(msg);
  else this.fail(msg);
}
Test.prototype.isnt = function(a,b,msg) {
  if(a != b) this.succeed(msg);
  else this.fail(msg);
}
Test.prototype.like = function(a,regex,msg) {
  if(regex(a) != null) this.succeed(msg);
  else this.fail(msg);
}
Test.prototype.unlike = function(a,regex,msg) {
  if(regex(a) == null) this.succeed(msg);
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

module.exports = Test;
