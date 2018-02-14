'use strict';
var Alexa = require("alexa-sdk");
var config = require('./config');
var util = require('./util');
var feedHelper = require('./feedHelpers');

var feeds = require('./feeds');

var dynasty = require('dynasty')({ region: process.env.AWS_DEFAULT_REGION });
var sessions = dynasty.table(config.sessionDBName);
var itemLister = util.itemLister;
var itemPicker = util.itemPicker;
var feedLoader = feedHelper.feedLoader;
let items = [];

// var users = dynasty.table('makeMeSmart');

var episodes = [];
var explainers = [];

let showImage;

exports.handler = function(event, context) {
    var alexa = Alexa.handler(event, context);
    alexa.appId = config.appId;
    alexa.dynamoDBTableName = config.dynamoDBTableName;
    alexa.registerHandlers(handlers);


    alexa.execute();
};

var handlers = {
    // 'NewSession': function () {
    //   if (this.attributes.iterating === 'show') {// seems like a state handler use case?
    //     this.attributes.showIndex = 0;
    //   }
    //   console.log('WILL I THEN HIT the original destination?');
    //
    // },
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
        this.attributes.queries = this.attributes.queries || [];
        this.attributes.queries.push(query);
        console.log('attributes/after', this.attributes);
        // query = 'cheeseburgers'
        this.response.speak(`I'm gonna look for something on ${query}`)
            .cardRenderer(`here's what i got on ${query}.`);
        this.emit(':responseReady');
    },


    'ListShows': function () { // SHOWS AND ITEMS MIGHT BE EASILY MERGED EVENTUALLY
      console.log('SHOW pick')
      this.attributes.indices = this.attributes.indices || {};

      if (this.event.session.new) {
        this.attributes.indices.show = 0;
      }
      console.log('start list shows', this.attributes.indices.show);
      this.attributes.iterating = 'show'; // This might be better done via the statehandler API
      // Output the list of all feeds with card
      var image = util.cardImage("https://www.runnersworld.com/sites/runnersworld.com/files/styles/article_main_custom_user_desktop_1x/public/ryssdal200902_200.jpg?itok=hU0uFezE&timestamp=1347392245");
      if (!this.attributes.indices.show) {
        this.attributes.indices.show = 0;
      }

      var data = itemLister(feeds, 'shows', 'feed', this.attributes.indices.show, config.items_per_prompt['show']); // HEY: uses item lister

      console.log('end list shows', this.attributes.indices.show);
      this.emit(':askWithCard', data.itemsAudio, 'what do you want', 'Our shows', data.itemsCard, image );
      this.emit(':responseReady');

      // Go into feed
    },

    'ListEpisodes': function () {
      var show = this.event.request.intent.slots.show.value || this.attributes.show;
      this.attributes.indices = this.attributes.indices || {};
      this.attributes.iterating = 'episode';
      this.attributes.indices.episode = this.attributes.indices.episode || 0;

      console.log('list episodes', show);
      console.log(episodes);

      var data = util.itemLister(episodes, 'episodes', 'title', this.attributes.indices.episode, config.items_per_prompt['episode'])
      console.log(data)
      this.emit(':askWithCard', data.itemsAudio, 'what do you want', 'EPISODES ', data.itemsCard, showImage );

      // Go into feed
    },
    'PickShow': function() {
      // if feeds are being iterated, should destroy that index
      // slots should be specific. show_title rather than title...
      console.log('SHOW pick')
      //NOTE: what if we're not currently iterating the shows?
      console.log('episodes persistence?', episodes);
      var chosen = itemPicker(this.event.request.intent.slots, feeds, 'feed');
      var showImage = util.cardImage(chosen.image);
      this.attributes.show = chosen.feed;
      this.attributes.indices = this.attributes.indices || {};
      this.attributes.indices.show = null;
      this.attributes.indices.episode = 0;
      console.log('CHOSEN ', chosen);
      console.log(this.attributes);
      console.time('feedload')
      var boundThis = this;
      feedLoader(chosen.url, function(err, feedData) {

        console.log('err', err)
        console.log('feedData', feedData)
        episodes = feedData;

        // will not wait for card, must use progressive RESPONSE
        console.timeEnd('feedload')
        boundThis.emit(
          ':askWithCard',
          `You chose ${chosen.feed}. Should I play the latest episode or list ${feedData.length} episodes?`,
          'Say play latest or list episodes.',
          'Selected Show: ',
          `${chosen.feed}: Say play latest or list episodes`,
          showImage
        );
      });



    },

    'PickEpisode': function () {
      console.log('Episode pick')

    },

    PickItem: function () {
      console.log('general pick')
      // should I be using state handlers for iterating through each type of item?

    },
    'SessionEndedRequest' : function() {
      // save the session i guess
      // console.log('Session ended with reason: ' + this.event.request.reason);
      this.attributes.indices.show = null;
      this.emit(':saveState', true);

    },
    'AMAZON.NextIntent' : function () { // we'll have to handle for iterating through shows, eps and explainers separaterly
      this.attributes.indices[this.attributes.iterating] += config.items_per_prompt[this.attributes.iterating];
      console.log("after NEXT FIRES", this.attributes.indices);
      this.emit(':saveState', true);
      // needs to handle different items being iterated
      this.emit('ListShows');
    },
    'AMAZON.PreviousIntent' : function () {
      this.attributes.indices[this.attributes.iterating] -= config.items_per_prompt[this.attributes.iterating];
      console.log('after PREVIOUS FIRES',this.attributes.indices)
      this.emit(':saveState', true);

      console.log("PREVIOUS FIRES ");

      //I guess this would move the current index backwards by the per prompt?
      this.emit('ListShows');
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
