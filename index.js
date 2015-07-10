var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var app = express();
var config = require('./config');
var Slackhook = require('slackhook');
var moment = require('moment');

var _  = require('underscore');
// Import Underscore.string to separate object, because there are conflict functions (include, reverse, contains)
_.str = require('underscore.string');
// Mix in non-conflict functions to Underscore namespace if you want
_.mixin(_.str.exports());


// Move this into Redis or something.
global.showbot = {};
global.showbot.shows = {};


app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded()); // to support URL-encoded bodies
app.set('port', (process.env.PORT || 8087));
app.use(express.static(__dirname + '/public'));

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'));
})

app.post('/slack',function(req,res,next) {
	if( req.body.user_name !== 'slackbot' ) {
		var response = parseCommand(req.body);
	}

	// note that if this response returns something, it will get
	// displayed in the channel from "slackbot". Returning an
	// empty string hides the response.
    res.send(response);
});


function speak(message, channel, to, emoji) {
	var slack = new Slackhook({
	    domain: config.slack_domain,
	    token: config.slack_token
	});

	var text = message || 'hmmm...';
	var channel = (channel === 'directmessage')?'@'+to:'#'+channel;

	if (emoji) {
		slack.send({
		    text: text,
		    channel: channel,
		    username: config.name,
		    icon_emoji: emoji
		});
	} else {
		slack.send({
		    text: text,
		    channel: channel,
		    username: config.name,
		    icon_url: config.icon
		});
	}
	
}

/**
  * Sample commands.
  *
  *
  * /showbot help
  * /showbot start
  * /showbot start target: 30
  * /showbot start by: 10
  * /showbot start show: td89 
  * /showbot stop
  * /showbot Edit bg noise.
  */ 
function parseCommand(query) {

	// 
	var message = query.text;
	var channel = query.channel_name;
	var from = query.user_name;

	// speak('I heard you say: '+message, channel, from, '');

	// Split string 
	var commands = message.split(' ');

	if (commands[0] !== '') {

		while (commands.length) {

			var command = commands.shift();

    		switch (command) {

    			case 'help':
    				helpText  = "I figured you'd need some help with "+config.name+". I suppose it's cool, but not as easy to use as dependable ol' slackbot.\n\n";
    				helpText += "*"+config.name+" Commands:* \n";
    				helpText += "\t_/"+config.bot_command+" start_\n";
    				helpText += "\t_/"+config.bot_command+" stop_\n";
    				helpText += "\t_/"+config.bot_command+" time_\n";
    				helpText += "\t_/"+config.bot_command+" reset_\n";
    				helpText += "\t_/"+config.bot_command+" notes_\n";
    				helpText += "\t_/"+config.bot_command+" list_\n";
    				helpText += "\t_/"+config.bot_command+" help_\n";
    				return helpText;
    				break;

    			case 'start':
    				// parseModfiers(commands);
    				if (channel !== 'directmessage') {

    					// Check to see if show exists.
						if(!global.showbot.shows.hasOwnProperty(channel)) {
							resetShow(channel);
						}
						if (global.showbot.shows[channel].stop) {
							var timeMsg = getTime(channel);
							var msg = "*"+channel+" has already finished recording.* \n\nThe total time was: ["+timeMsg+"].\n\nYou can view any notes with '/"+config.bot_command+" notes'.\n\nYou can reset this show to start again with '/"+config.bot_command+" reset'."
    						speak(msg, channel, from, ':clock10:');
						} else if (global.showbot.shows[channel].start) {
							var timeMsg = getTime(channel);
							var msg = "*"+channel+" is already timing.* \n\nCurrent time is: ["+timeMsg+"]";
    						speak(msg, channel, from, ':clock10:');
						} else {
							speak("*Starting "+channel+".* \n\nUse '/"+config.bot_command+" time' to get updates outside my requested reporting interval.\n\nIf you send me a non-command message, I'll save it with the show's timestamp.\n\n'/"+config.bot_command+" stop' will end the show.", channel, from, '');
							global.showbot.shows[channel].start = new Date().getTime();

							console.log('start: '+global.showbot.shows[channel].start);

							global.showbot.shows[channel].timer = setInterval(function() { 
								var timeMsg = getTime(channel);
    							speak(timeMsg, channel, from, ':clock10:');
    						}, 10000);
    					}
    				} else {
    					speak("@"+from+", I can't do this in a DM. Well actually, I could, but it would be weird for everyone.", channel, from, '');
    				}
    				break;

    			case 'stop':
    				if (channel === 'directmessage') {
    					speak("@"+from+", I can't do this in a DM. Well actually, I could, but it would be weird for everyone.", channel, from, '');
    				} else {
    					// Check to see if show exists.
						if(!global.showbot.shows.hasOwnProperty(channel)) {
							resetShow(channel);
						}
						if (global.showbot.shows[channel].stop) {
							var timeMsg = getTime(channel);
							var msg = "*"+channel+" has already finished recording.*\n\nThe total time was: ["+timeMsg+"].\n\nYou can view any notes with '/"+config.bot_command+" notes'.\n\nYou can reset this show to start again with '/"+config.bot_command+" reset'."
						} else if (global.showbot.shows[channel].start) {
    						stopShow(channel);
    						var timeMsg = getTime(channel);
    						speak("*Stopped "+channel+"*\n\nThe total time was: ["+timeMsg+"]", channel, from, ':clock10:');
    					} else {
    						speak("*"+channel+" hasn't started yet.*\n\nYou can start the show with '/"+config.bot_command+" start'.", channel, from, '');
    					}
    				}
    				break;

    			case 'notes':
    				if (channel !== 'directmessage') {
    					var notes = getNotes(channel);
    					speak('*Notes for '+channel+".*\n\n"+notes, channel, from, '');
    				} else {
    					speak("@"+from+", I can't do this in a DM. Well actually, I could, but it would be weird for everyone.", channel, from, '');
    				}
    				break;

    			case 'reset':
    				if (channel !== 'directmessage') {
    					speak('*Resetting '+channel+".* ", channel, from, '')
    					resetShow(channel);
    				} else {
    					speak("@"+from+", I can't do this in a DM. Well actually, I could, but it would be weird for everyone.", channel, from, '');
    				}
    				break;

    			case 'time':
    				if (channel !== 'directmessage') {
    					var timeMsg = getTime(channel);
    					speak(timeMsg, channel, from, ':clock10:');
    				} else {
    					speak("@"+from+", I can't do this in a DM. Well actually, I could, but it would be weird for everyone.", channel, from, '');
    				}
    				break;

    			case 'list':
    				speak("Here are the shows I have:\n\nNah, just kidding, I can't do that yet. Blame @creator. Damn, even that's a placeholder!", channel, from, '');
    				break;

    			// It's a note.
    			default:
    				var note = command+" "+commands.join(" ");
    				var noteMsg = takeNote(channel, note);
    				var timeMsg = getTime(channel);
    				speak(timeMsg, channel, from, ':clock10:');
    				speak(timeMsg+" - "+noteMsg, channel, from, '');
    				commands = [];
    				return '';
    				break;

    		}

		}

	} else {
		speak('Howdy, @'+from+'.', channel, from, '');
	}

	return '';

}


function parseModfiers(commands) {

}

function startShow(showname) {
	
}

function stopShow(showname) {
	// Check to see if show exists.
	if(global.showbot.shows.hasOwnProperty(showname)) {
		if (global.showbot.shows[showname].start) {
			if (global.showbot.shows[showname].stop) {
				return showname+" has already been stopped.";
			} else {
				clearInterval(global.showbot.shows[showname].timer);
				global.showbot.shows[showname].stop = new Date().getTime();
				return "Stopping "+showname;
			}
		} 
	}

	return showname+" hasn't started a show yet."
}

// Gets current time if running, gets total time if done.
function getTime(showname) {
	// Check to see if show exists.
	if(global.showbot.shows.hasOwnProperty(showname)) {
		if (global.showbot.shows[showname].start) {
			if (global.showbot.shows[showname].stop) {
				var timespan = global.showbot.shows[showname].stop - global.showbot.shows[showname].start;
			} else {
				var timespan = getTimespan(showname);
			}
			var duration = moment.duration(timespan);
			return _.pad(duration.hours(), 2, '0')+":"+_.pad(duration.minutes(), 2, '0')+":"+_.pad(duration.seconds(), 2, '0');
		} 
	}

	return showname+" hasn't been started yet."
}

function getTimespan(showname) {
	if(global.showbot.shows.hasOwnProperty(showname)) {
		if (global.showbot.shows[showname].start) {
			var now = new Date().getTime();
			var timespan = now - global.showbot.shows[showname].start;
			return timespan;
		}
	}
	return 0;
}

function takeNote(showname, note) {
	// Check to see if show exists.
	if(global.showbot.shows.hasOwnProperty(showname)) {
		if (global.showbot.shows[showname].start) {

				var time = getTime(showname);
				var now = new Date().getTime();

				global.showbot.shows[showname].notes.push(
					{
						time: time,
						timestamp: now,
						text: note
					}
				);
				return "_"+note+"_ ";
		} 
	}

	return showname+" hasn't been started yet."
}

function getNotes(showname) {
	// Check to see if show exists.
	if(global.showbot.shows.hasOwnProperty(showname)) {
		if (global.showbot.shows[showname].start) {
			if (global.showbot.shows[showname].notes.length) {

				var notes = '';
				_.each(global.showbot.shows[showname].notes, function(note){
					notes += note.time+" - _"+note.text+"_\n";
				});
				return notes;
				

			} else {
				return "There aren't any notes for "+showname+"."
			}
		} 
	}

	return showname+" hasn't been started yet."
}


function getNote() {

}

// Resets a show, or creates a new one.
function resetShow(showname) {
	global.showbot.shows[showname] = {
		start: null,
		stop: null,
		timer: null,
		name: showname,
		description: '',
		target: null,
		interval: 5,
		notes: []
	}
}


