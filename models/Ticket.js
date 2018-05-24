class Ticket {
  constructor(number, userID){
    this.number = number;
    this.userID = userID;
    this.intervalID = -1;
  }

  setReminders(timeNumber, timeUnit){
    if(this.intervalID != -1)
      clearInterval(this.intervalID);

    time = (timeUnit == 'minute' || timeUnit == 'minutes') ? 1000*60*timeNumber : 1000*60*60*timeNumber;

    this.intervalID = setInterval(function(){
      bot.startPrivateConversation({user: userIdOnCall}, function(err, convo){
      if(err){
        console.log(err);
      }

      convo.say("This is a reminder to update ticket number " + ticketNumber);
      })
    }, time);
  }

  notificationEnd(){
    clearInterval(this.intervalID);
  }
}

module.exports = Ticket;
