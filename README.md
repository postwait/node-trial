## Trial ##

Trail is a node module that provides concurrent testing with strong
dependency support.  Each test consists of bits that look quite a lot
like the perl Test::More bits.  Becuase they are asynchronous, it works
a tad differently.

### Overview ###

Each test consists of:

  * test // a function that runs the tests.
  * name // arbitrary user test name
  * plan // number of tests you intend to run
  * requires // array of named requirements
  * provides // array of named satisfications

Like typical tap tests, a test would look something like this:

    function() {
      this.ok(true, "this better pass");
      this.is(1+2, 3, "adding sorta works in javascript");
      this.ok(false, "this test will certainly fail");
    }

A test that includes this test must have a plan equal to 3. Due to
the asynchronous nature of many tests, the framework will wait until
three tests checks report back before considering the test complete.
If you trigger too few, it will hang waiting (as expected).  If you
trigger too many, the world will end (and it's your fault).

As tests run, they can stash things in a trial-accessible key value
store by calling this.stash("mykey", myvalue).  Tests can retrieve
this data by calling this.fetch("mykey").

A test can depend on another test by leveraging the requires and
provides arrays.  If the "createuser" test has a
provides: ['test_user_id'] and other tests in the system have
a requires: ['test_user_id'], then the dependent tests will wait
until the "createuser" test completes before beginning. This
combined with the stash/fetch provides a simple way to synchronize
complex and dependent tests while still maximizing concurrency.

Each test is run in a new `vm` sandbox.

### API ###

#### var trial = new Trial([params]) ####

creates a new trial object that respects the following param keys:

 * `verbose` [`false`] : be verbose
 * `brief`   [`false`] : be brief
 * `summary` [`true`] : summarize the trial
 * `incremental_reporting` [`false`] : don't wait until each test finishes
 * `tap` [`false`] : use TAP output (above are ignored)
 * `suppress` [`{}`] : keys of test names to suppress (not run)
 * `require` : an optional replacement for `require()` maintain sandboxing

Node, if `verbose`, `brief`, `summary`, or `incremental_reporting` are not
specified, then they are taken from the environment variables `TEST_VERBOSE`,
`TEST_BRIEF`, `TEST_SUMMARY`, or `INCREMENTAL_REPORTING`, respectively.

#### trial.run() ####

will start the trial executing all tests as the
dependency graph dictates. Upon completion a report will be issued.
Verbose details will be shown if TEST_VERBOSE environment variable is
set (or the verbose attribute is passed to the Trial creation).

#### trial.noexit() ####

informs the trial that upon completion it should not
exit (node) with a status code that indicates the overall trial
sucess (0 for good, 1 for bad).

If critical errors are encountered during test build or run, node will
exit with a value of 2.

#### trial.add(new Test(params)) ####

Adds a new test to a trial.

#### trial.load(dir) ####

Will recursively load all .tjs files and create
tests will full dependencies. .tjs files are javascript source files
that have each attribute of the Test (above) as global assignable
variables:

#### stupid.tjs ####

    name = "dumb test"
    plan = 1
    provides = ['no value']
    test = function() { this.ok(true, 'eureka'); }

### Larger integrations ###

The simple case can be solved using the `runtests` helper.

    var runtests = require('trial').runtests;
    var trial = runtests("./tests");

#### Junit output for CI integration ####

    # var trial = new Trial()
    var runtests = require('trial').runtests;
    var trial = runtests("./tests");
    new Junit(trial, "test_detail.xml");

