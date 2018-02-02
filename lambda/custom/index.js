'use strict';
var Alexa = require("alexa-sdk");
var config = require('./config');

// For detailed tutorial on how to making a Alexa skill,
// please visit us at http://alexa.design/build


exports.handler = function(event, context) {
    var alexa = Alexa.handler(event, context);
    alexa.appId = config.appId;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

var handlers = {
    'LaunchRequest': function () {
      console.log("CHECK LAUNCH REQ")
       this.response.speak('Welcome to Make Me Smart!')
       this.emit(':responseReady');

       // this.emit('Make Me Smart');
        // Play the latest
    },
    'ListBlurbs': function () {
      console.log('list blurbs')
      console.log(this);

      this.response.speak('we got some blurbs!')

      this.emit(':responseReady');

    },
    'FindBlurb': function () {
        console.log(this.event.request);

        var query = this.event.request.intent;
        this.response.speak("I'm gonna look for something")
            .cardRenderer("her's what i got on");
        this.emit(':responseReady');
    },
    'ListEpisodes': function () {
      console.log('lsit episodes')
      this.response.speak('epsiodes!')

      this.emit(':responseReady');

      // Go into feed
    },
    'SessionEndedRequest' : function() {
        console.log('Session ended with reason: ' + this.event.request.reason);
    },
    'AMAZON.StopIntent' : function() {
        this.response.speak('Bye');
        this.emit(':responseReady');
    },
    'AMAZON.HelpIntent' : function() {
        this.response.speak("You can try: 'make me smart about interest rates' or 'what are the latest episodes'");
        this.emit(':responseReady');
    },
    'AMAZON.CancelIntent' : function() {
        this.response.speak('Bye');
        this.emit(':responseReady');
    },
    'Unhandled' : function() {
        this.response.speak("Sorry, we're not quite that smart. Please try something else.");
    }
};
