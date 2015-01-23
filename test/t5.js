var Trial = require('../index').Trial;

var trial = new Trial();
trial.load(__dirname + "/t5");
trial.on('load', function() { trial.run(); });
