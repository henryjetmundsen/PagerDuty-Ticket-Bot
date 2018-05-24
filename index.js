const keys = require('./config/keys');
const options = require('./config/requestOptions');
const request = require('request');
const rp = require('request-promise');
const Ticket = require('./models/Ticket');
var ticketList = {};
var userIdOnCall = undefined;
/**
 * Define a function for initiating a conversation on installation
 * With custom integrations, we don't have a way to find out who installed us, so we can't message them :(
 */

function onInstallation(bot, installer) {
  if (installer) {
    bot.startPrivateConversation({user: installer}, function (err, convo) {
      if (err) {
        console.log(err);
      } else {
        convo.say("I'm the P0 bot! I'm here to automatically notify the oncall developer of any new P0s and send reminders to update the ticket until resolved.");
        convo.say("Most of my functions will handle automatically, however some commands rely on human interaction so /invite me to a channel to use them!");
      }
    });
  }
}

/**
 * Configure the persistence options
 */

var config = {};
if (process.env.MONGOLAB_URI) {
  var BotkitStorage = require('botkit-storage-mongo');
  config = {
    storage: BotkitStorage({mongoUri: process.env.MONGOLAB_URI}),
  };
} else {
  config = {
    json_file_store: ((process.env.TOKEN)?'./db_slack_bot_ci/':'./db_slack_bot_a/'), //use a different name if an app or CI
  };
}

/**
 * Are being run as an app or a custom integration? The initialization will differ, depending
 */

if (process.env.TOKEN || process.env.SLACK_TOKEN) {
  //Treat this as a custom integration
  var customIntegration = require('./lib/custom_integrations');
  var token = (process.env.TOKEN) ? process.env.TOKEN : process.env.SLACK_TOKEN;
  var controller = customIntegration.configure(token, config, onInstallation);
} else if (process.env.CLIENT_ID && process.env.CLIENT_SECRET && process.env.PORT) {
  //Treat this as an app
  var app = require('./lib/apps');
  var controller = app.configure(process.env.PORT, process.env.CLIENT_ID, process.env.CLIENT_SECRET, config, onInstallation);
} else {
  console.log('Error: If this is a custom integration, please specify TOKEN in the environment. If this is an app,'
    + ' please specify CLIENTID, CLIENTSECRET, and PORT in the environment');
  process.exit(1);
}

/**
 * Core bot logic goes here!
 */
// BEGIN EDITING HERE!

controller.on('bot_channel_join', function (bot, message) {
  bot.reply(message, "The P0 bot has arrived!");
});

// The big kahuna. This guy may be dirty af, but he gets the job done
controller.hears("p0 open", ['direct_mention', 'mention', 'direct_message'], function(bot, message){
  messageText = message.text.split(' ');

  var ticketNumber = messageText[2];

  rp(options.slackUsers).then(function(slackUsers){
    var users = slackUsers.members;
    var userList = {};

    for(var i = 0; i < users.length; i++){
      userList[users[i].real_name] = users[i].id;
    }

    request(options.onCall, (err, res, body) => {
      if (err){
        return console.log(err);
      }

      body = body.oncalls;

      var userName = body[2].user.summary;
      userIdOnCall = /*userList[userName]*/ 'UATBQNHML';

      bot.reply(message, userName + ' is on call');

      if(userIdOnCall == undefined){
        bot.reply(message, "It appears that the person on call hasn't set their real name in slack so I" 
          + " was unable to DM them about the P0 situation.");
        return;
      }

      bot.startPrivateConversation({user: userIdOnCall}, function(err, convo){
         if(err){
         console.log(err);
         }
      
         convo.say("A P0 has just been opened and you are the developer on call! The ticket number is " + ticketNumber 
           + ". You will be reminded to update the ticket every hour. The interval between reminders can be changed using" 
           + " @myawesomebot time <ticket number> <time number> <minutes or hours>.");
      });

       ticketList[ticketNumber] = new Ticket(ticketNumber, userIdOnCall);

       ticketList[ticketNumber].setReminders(1, 'hour');
    });
  });
});

controller.hears("p0 close", ['direct_mention', 'mention', 'direct_message'], function(bot, message){
  messageText = message.text.split(' ');

  if(messageText.length != 3){
    bot.reply(message, "Invalid format. It looks like you're trying to close a p0 ticket. The command is 'p0 close <ticket number>");
    return;
  }

  if(ticketList[messageText[2]] == undefined){
    bot.reply(message, "You did not enter a valid ticketID");
    return;
  }

  var temp = ticketList[messageText[2]];
  var ticketNumber = messageText[2];
  temp.notificationEnd();
  delete ticketList[messageText[2]];

  bot.reply(message, "Ticket number " + ticketNumber + " has been successfully deleted! Great hustle family. One less p0 to worry about.");
});

controller.hears("p0 time", ['direct_mention', 'mention', 'direct_message'], function(bot, message){
  messageText = message.text.split(' ');

  if(message.length != 5){
    bot.reply(message, "It looks like you entered the wrong format. It should be 'p0 time <ticket number> <timeNumber> <timeUnit> where time unit is either in minutes or hours'");
    return;
  }

  var ticketNumber = messageText[2];
  var timeNumber = parseInt(messageText[3]);
  var timeUnit = messageText[4];

  if(timeNumber == NaN){
    bot.reply(message, "Please enter a real number for the time");
    return;
  }

  var temp = ticketList[ticketNumber];

  if(temp == undefined){
    bot.reply(message, "The ticket number you entered is invalid.");
    return;
  }

  temp.setReminders(timeNumber, timeUnit);

  bot.reply(message, "The time intervals for ticket updates has been changed to " + timeNumber + " "  + timeUnit);

  bot.startPrivateConversation({user: userIdOnCall}, function(err, convo){
    if(err){
      console.log(err);
    }

    convo.say("The interval was updated for ticket number" + ticketNumber + " so you may need to update it.")
  });
}

controller.hears('escalation', ['direct_mention', 'mention', 'direct_message'], function(bot, message){
  request(options.escalation, (err, res, body) => {
    body = body.oncalls;
  
    var escalation1 = body[2].user.summary;
    var escalation2 = body[1].user.summary;
    var escalation3 = body[0].user.summary;

  bot.reply(message, "Escalation 1: " + escalation1 + "\nEscalation 2: " + escalation2 + "\nEscalation 3: " + escalation3);
  })
})
