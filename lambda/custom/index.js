'use strict';
var Alexa = require("alexa-sdk");
var config = require('./config');
var util = require('./util');
// For detailed tutorial on how to making a Alexa skill,
// please visit us at http://alexa.design/build

var dynasty = require('dynasty')(config.credentials);
console.log("WTF ", config.sessionDBName, 'and process ', process.env)
var sessions = dynasty.table(config.sessionDBName);

exports.handler = function(event, context) {
    var alexa = Alexa.handler(event, context);
    alexa.appId = config.appId;
    alexa.dynamoDBTableName = config.dynamoDBTableName;
    alexa.registerHandlers(handlers);
    console.log("WHEN DO I FIRE");


    alexa.execute();
};

var handlers = {
    'LaunchRequest': function () {
      console.log("CHECK LAUNCH REQ", this.event.session.user.userId);
      sessions.find(this.event.session.user.userId, function (err, sessions) {
        if (err) {
          console.log('err', err)
        } else {
          console.log('sessions')
          console.log(sessions)
        }
      });
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
        console.log('context', this.context)
        console.log('atts before  ',this.attributes);
        console.log('WHOLE EVENT', JSON.stringify(this.event));
        var query = this.event.request.intent.slots.topic.value;
        //
        this.attributes.sessionId = this.event.session.sessionId;
        this.attributes.queries =  this.attributes.queries || [];
        this.attributes.queries.push(query);
        console.log('attributes/after', this.attributes);
        // query = 'cheeseburgers'
        this.response.speak(`I'm gonna look for something on ${query}`)
            .cardRenderer(`here's what i got on ${query}.`);
        this.emit(':responseReady');
    },
    'ListEpisodes': function () {
      var show = this.event.request.intent.slots.show.value;

      console.log('list episodes', show);
      this.response.speak('epsiodes!')

      this.emit(':responseReady');

      // Go into feed
    },
    'ListShows': function () {
      // var show = this.event.request.intent.slots.show.value;
      this.response.speak('HERE ARE OUR SHOWS!');
      console.log("LIST SHOWS FIRED")
      console.log("event", JSON.stringify(this.event));
      console.log("cont", this.event.context)
      console.log("STATE", this.handler)
      // Output the list of all feeds with card
      var image = util.cardImage("https://www.runnersworld.com/sites/runnersworld.com/files/styles/article_main_custom_user_desktop_1x/public/ryssdal200902_200.jpg?itok=hU0uFezE&timestamp=1347392245");
      var data = util.feedLister()
      console.log("LIST FEEDS CAT LIST", data.cardCategoryList)
      this.emit(':askWithCard', data.categoryList, 'heyyy', 'Our shows', data.cardCategoryList, image )

      console.log("DOES THIS RUN?")
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
