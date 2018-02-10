'use strict';
var Alexa = require("alexa-sdk");
var config = require('./config');
var util = require('./util');
// For detailed tutorial on how to making a Alexa skill,
// please visit us at http://alexa.design/build
var feeds = require('./feeds');

var dynasty = require('dynasty')({ region: process.env.AWS_DEFAULT_REGION });
var sessions = dynasty.table(config.sessionDBName);
var itemLister = util.itemLister;

// var users = dynasty.table('makeMeSmart');

exports.handler = function(event, context) {
    var alexa = Alexa.handler(event, context);
    alexa.appId = config.appId;
    alexa.dynamoDBTableName = config.dynamoDBTableName;
    alexa.registerHandlers(handlers);


    alexa.execute();
};

var handlers = {
    'LaunchRequest': function () {
      // var params = {
      //   TableName: 'makeMeSmart',
      //   Key: {'userId': this.event.session.user.userId}
      // };
      // var session_params = {
      //   TableName: 'sessions',
      //   Key: {'userId': this.event.session.user.userId, sessionStart: this.event.request.timestamp}
      // };
      this.attributes.latestSession = this.event.session.sessionId;

      var boundThis = this;
      console.log("WTF DOG  ", this.event.session.user.userId);
      console.log('MY USER ATTRIBUTE', this.attributes);
      console.log('sesh id ', boundThis.event.session.sessionId);
      if (this.event.session.new) { // can put this in new session right? or no?
        sessions.insert({userId: boundThis.event.session.user.userId, sessionId: boundThis.event.session.sessionId, begin: boundThis.event.request.timestamp, userId:boundThis.event.session.user.userId})
          .then(function(resp){
            console.log('new sesh babe i tried to insert', resp);
            boundThis.response.speak('INSERTED A SESSION, maybe')
            boundThis.emit(':responseReady');

          })
          .catch(function(err){
            console.log('session insert fail fail', err)
            boundThis.response.speak('baaad insert')
            boundThis.emit(':responseReady');

          })
      } else {
        console.log(typeof this.event.session.user.userId);
        sessions.find({hash: this.event.session.user.userId, range: boundThis.event.session.sessionId})
          .then(function(data){
            console.log("SESSIONS WHAT", data)
            boundThis.response.speak('bueno! FROM SESSIONS')
            boundThis.emit(':responseReady');
          }).catch(function(err){
            console.log('session fail', err)
            boundThis.response.speak('baaad SESSIONS')
            boundThis.emit(':responseReady');

          })

      }

      // docClient.get(session_params, function(err, data) {
      //   if (err) {
      //     console.log("Error", err);
      //     boundThis.response.speak('Welcome to Make Me Smart!')
      //     boundThis.emit(':responseReady');
      //
      //   } else {
      //     console.log("SESSions", data);
      //     boundThis.response.speak('Welcome to Make Me Smart!')
      //     boundThis.emit(':responseReady');
      //
      //   }
      // });

      // docClient.get(params, function(err, data) {
      //   if (err) {
      //     console.log("Error", err);
      //   } else {
      //     console.log("Success", data.Item);
      //   }
      // });

      // console.log(docClient);
      // console.log("CHECK LAUNCH REQ", this.event.session.user.userId);
      // users.find(this.event.session.user.userId, function (err, user) {
      //   if (err) {
      //     console.log('err', err)
      //   } else {
      //     console.log('user')
      //     console.log(user)
      //   }
      // });
       // this.response.speak('Welcome to Make Me Smart!')
       // this.emit(':responseReady');

       // this.emit('Make Me Smart');
        // Play the latest
    },

    'ListExplainers': function () {
      console.log('list Explainers')
      console.log(this);

      this.response.speak('we got some Explainers!')

      this.emit(':responseReady');

    },
    'FindExplainer': function () {
        var query = this.event.request.intent.slots.topic.value;
        //
        this.attributes.latestSession = this.event.session.sessionId;
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
      // or, if there is none, then what? either a default value, or handle the user's favorite yadda yadda
      console.log('list episodes', show);
      this.response.speak('epsiodes!')

      this.emit(':responseReady');
      var data = util.itemLister()
      // Go into feed
    },
    'PickEpisode': function () {

    },
    'ListShows': function () {
      // var show = this.event.request.intent.slots.show.value;
      this.response.speak('HERE ARE OUR SHOWS!');
      // Output the list of all feeds with card
      var image = util.cardImage("https://www.runnersworld.com/sites/runnersworld.com/files/styles/article_main_custom_user_desktop_1x/public/ryssdal200902_200.jpg?itok=hU0uFezE&timestamp=1347392245");

      var data = itemLister(feeds, 'Shows', 'feed', 0, 4); // HEY: CAN I MAKE this use item lister eventually? probably
      console.log(data)
      this.emit(':askWithCard', data.itemsAudio, 'what do you want', 'Our shows', data.itemsCard, image );
      this.emit(':responseReady');

      // Go into feed
    },
    ChooseShow: function () {

    },
    'SessionEndedRequest' : function() {
      // save the session i guess

        console.log('Session ended with reason: ' + this.event.request.reason);
    },
    'AMAZON.StopIntent' : function() {
        this.response.speak('stop');
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
