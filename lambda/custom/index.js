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
var sendProgressive = util.sendProgressive;

var feedLoader = feedHelper.feedLoader;
let items = [];

// var users = dynasty.table('makeMeSmart');

var episodes = {};
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
            boundThis.response.speak('INSERTED A SESSION, maybe').listen("why don't you try something");
            // have to ask to prevent session end
            boundThis.emit(':responseReady');

          })
          .catch(function(err){
            console.log('session insert fail fail', err)
            boundThis.response.speak('baaad insert').listen("why don't you try something");
            boundThis.emit(':responseReady');

          })
      } else {
        // what the fuck am i doing wrong here?
        console.log(typeof this.event.session.user.userId);
        sessions.find({hash: this.event.session.user.userId, range: boundThis.event.session.sessionId})
          .then(function(data){
            console.log("SESSIONS WHAT", data)
            boundThis.response.speak('bueno! FROM SESSIONS').listen("why don't you try something");
            boundThis.emit(':responseReady');
          }).catch(function(err){
            console.log('session fail', err)
            boundThis.response.speak('baaad SESSIONS').listen("why don't you try something");
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


        // separate card cardRenderer

      //   this.response.cardRenderer(cardTitle, cardContent, null);
      // this.response.speak(message).listen(reprompt);
      //
      // this.emit(':responseReady');
    },

    'List_explainers': function () {
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


    'List_shows': function () { // SHOWS AND ITEMS MIGHT BE EASILY MERGED EVENTUALLY
      console.log('SHOW pick')
      this.attributes.indices = this.attributes.indices || {};

      if (this.event.session.new || (!this.attributes.indices.show)) {
        this.attributes.indices.show = 0;
      }
      this.attributes.iterating = 'show'; // This might be better done via the statehandler API
      // Output the list of all feeds with card
      var image = util.cardImage("https://www.runnersworld.com/sites/runnersworld.com/files/styles/article_main_custom_user_desktop_1x/public/ryssdal200902_200.jpg?itok=hU0uFezE&timestamp=1347392245");
      if (!this.attributes.indices.show) {
        this.attributes.indices.show = 0;
      }

      var data = itemLister(
        feeds,
        `${this.attributes.iterating}s`,
        'feed',
        this.attributes.indices[this.attributes.iterating],
        config.items_per_prompt[this.attributes.iterating]
      );
      this.emit(':askWithCard', data.itemsAudio, 'what do you want', 'Our shows', data.itemsCard, image );
      this.emit(':responseReady');

      // Go into feed
    },

    'List_episodes': function () {
      // TODO: if we get here directly, NOT having gone through 'Pick Show', we need to do some state management
      // (IF do we have a show selected? are we iterating through episodes? Do we have the feed live? We would have to pull the feed
      this.attributes.indices = this.attributes.indices || {};
      this.attributes.iterating = 'episode';
      this.attributes.indices.episode = this.attributes.indices.episode || 0;
      console.log("What'sthe show", this.event.request.intent.slots, this.attributes.show);
      console.log('EPISODE PERSISTENCE ', episodes);
      if (!episodes[this.attributes.show]) {
        // not in cache, gotta fresh pull
      }
      var feedEpisodes = episodes[this.attributes.show].items;
      var data = util.itemLister(feedEpisodes, `${this.attributes.iterating}s`, 'title', this.attributes.indices[this.attributes.iterating], config.items_per_prompt[this.attributes.iterating]);
      console.log('DATA', data)
      this.emit(':askWithCard', data.itemsAudio, 'what do you want', `${this.attributes.show} episodes:`, data.itemsCard, showImage );

      // Go into feed
    },
    'PickShow': function() {
      // also need out of bounds era on numbers, right?
      // if feeds are being iterated, should destroy that index
      // slots should be specific. show_title rather than title...
      //NOTE: what if we're not currently iterating the shows IE. someone just says "CHOOSE show x"?
      // GOTTA HANDLE FOR THAT
      // NOTE: currently putting show loading behind 1 hour cache... on testing the sendProgressive takes just as long as the damn lookup in most of the cases, so this might not be worth it.
      var chosen = itemPicker(this.event.request.intent.slots, feeds, 'feed');
      var showImage = util.cardImage(chosen.image);
      this.attributes.show = chosen.feed;
      this.attributes.indices = this.attributes.indices || {};
      this.attributes.indices.show = null;
      this.attributes.indices.episode = 0;
      console.log('CHOSEN ', chosen, 'and do we have it loaded ', episodes[chosen.feed]);
      // console.log(this.event.request);
      var boundThis = this;
      if (episodes[chosen.feed] && episodes[chosen.feed].pulledAt > (Date.now() - (1000 * 60 * 60))) {
        console.log('within hour cache hit') // this is only if the session stays live though. Think about and whether to put it on user attributes. (MEH, prolly don't want to do that. )
        boundThis.emit(
          ':askWithCard',
          `You chose ${chosen.feed}. Should I play the latest episode or list ${episodes[chosen.feed].items.length} episodes?`,
          'Say play latest or list episodes.',
          `${chosen.feed}`,
          `Say "play latest" to hear the latest episode or "list episodes" to explore ${episodes[chosen.feed].items.length} episodes.`,
          showImage
        );
      } else {
        // send a message before we fully load the feed
        sendProgressive(
          this.event.context.System.apiEndpoint, // no need to add directives params
          this.event.request.requestId,
          this.event.context.System.apiAccessToken,
          `Let me check for new episodes of ${chosen.feed}.`,
          function (err, thing) {
            console.log('uh wtf', err, thing)
          }
        );
        console.time('feedload')
        feedLoader(chosen.url, function(err, feedData) {
          episodes[chosen.feed] = {
            pulledAt: Date.now(),
            items:feedData
          }
          boundThis.emit(
            ':askWithCard',
            `Okay, I found ${episodes[chosen.feed].items.length} episodes of ${chosen.feed}. Should I play the latest or list them?`,
            'Say play latest or list episodes.',
            `${chosen.feed}:`,
            `Say "play latest" to hear the latest episode or "list episodes" to explore ${episodes[chosen.feed].items.length} episodes.`,
            showImage
          );
          boundThis.emit('List_episodes');
        });

      }



    },

    'ListItems': function () {
      // possible future catch all?
    },

    'PickEpisode': function () {
      // need out of bounds error on numbers, god forbid look up by title.
      // still have to deal with play latest
      // if iterating == episodes
        // attributes.show is the show
        // slots: index, ordinal, episode_title
      // if not iterating EPISODES
        // slots: show_title should be there
        // if not, just either pick last show, or default to whatever we want.
      var show = this.attributes.show
      var chosenEp = itemPicker(this.event.request.intent.slots, episodes[show].items, 'title');

      console.log('Episode pick - iterating', this.attributes.iterating, ' show ', this.attributes.show);
      console.log('slots baby', this.event.request.intent.slots);
      console.log(chosenEp);
      /// no image???
      this.emit(
        ':askWithCard',
        `${chosenEp.title}`,
        'should be playin',
        `${this.attributes.show}`,
        `${chosenEp.title} shouold be playing ${chosenEp.date} there are ${episodes[show].items.length} others.`,
        showImage
      );


    },

    PickItem: function () {
      console.log('general pick')
      // should I be using state handlers for iterating through each type of item?

    },
    'SessionEndedRequest' : function() {
      // save the session i guess
      console.log('Session ended with reason: ' + this.event.request.reason);
      if(this.attributes.iterating === 'show') {
        if(this.attributes.indices && this.attributes.indices.show) {
          this.attributes.indices.show = 0;
        }
      }
      this.emit(':saveState', true);

    },
    // NEXT AND PREVIOUS: for now, will call explicit listEntity functions for each.
    // For now, will allow us
    'AMAZON.NextIntent' : function () {
      this.attributes.indices[this.attributes.iterating] += config.items_per_prompt[this.attributes.iterating];
      console.log("after NEXT FIRES", this.attributes.indices);
      this.emit(':saveState', true);
      this.emit(`List_${this.attributes.iterating}s`);
    },
    'AMAZON.PreviousIntent' : function () {
      this.attributes.indices[this.attributes.iterating] -= config.items_per_prompt[this.attributes.iterating];
      console.log('after PREVIOUS FIRES',this.attributes.indices);
      this.emit(':saveState', true);

      console.log("PREVIOUS FIRES ");

      this.emit(`List_${this.attributes.iterating}s`);
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
