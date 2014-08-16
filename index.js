var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var app = express();
var config = require('./config');
var Slackhook = require('slackhook');

var _  = require('underscore');
// Import Underscore.string to separate object, because there are conflict functions (include, reverse, contains)
_.str = require('underscore.string');
// Mix in non-conflict functions to Underscore namespace if you want
_.mixin(_.str.exports());


app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded()); // to support URL-encoded bodies
app.set('port', (process.env.PORT || 8087));

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'));
})

app.post('/slack',function(req,res,next) {
	if( req.body.user_name !== 'slackbot' ) {
		speak('I heard you say: '+req.body.text, req.body.channel_name, req.body.user_name, '');
	}

	// note that if this response returns something, it will get
	// displayed in the channel from "slackbot". Returning an
	// empty string hides the response.
    res.send('');
});



function speak(message, channel, to, emoji) {
	var slack = new Slackhook({
	    domain: config.slack_domain,
	    token: config.slack_token
	});

	var text = message || 'hmmm...';
	var channel = (channel === 'directmessage')?'@'+to:'#'+channel;
	var emoji = emoji || config.emoji;

	slack.send({
	    text: text,
	    channel: channel,
	    username: config.name,
	    icon_emoji: emoji
	});
}

/**
  * Sample commands.
  *
  *
  * /showbot help
  * /showbot start
  * /showbot start target=30
  * /showbot start by=10
  * /showbot start show=td89 
  * /showbot stop
  * /showbot Edit bg noise.
  */ 
function parseCommand(command) {

	// Split string 
}


