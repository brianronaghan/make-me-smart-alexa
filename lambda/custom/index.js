'use strict';
var Alexa = require("alexa-sdk");
var config = require('./config');
var util = require('./util');
var feedHelper = require('./feedHelpers');
var feeds = config.feeds;
var audioEventHandlers = require('./audioEventHandlers');
var audioPlayer = require('./audioPlayer')
var sendProgressive = util.sendProgressive;
var stateHandlers = require('./stateHandlers')
var feedLoader = feedHelper.feedLoader;
// var users = dynasty.table('makeMeSmart');
// var AWS = require('aws-sdk');
// AWS.config.update({
//   region: "us-east-1" // or whatever region your lambda and dynamo is
//   });

exports.handler = function(event, context) {
    var alexa = Alexa.handler(event, context);
    alexa.appId = config.appId;
    alexa.dynamoDBTableName = config.dynamoDBTableName;
    alexa.registerHandlers(
      audioEventHandlers,
      stateHandlers.startModeHandlers,
      stateHandlers.explainerModeHandlers,
      stateHandlers.iteratingExplainerModeHandlers

    );
    // console.log("EVENT  ", JSON.stringify(event, null,2));
    alexa.execute();
};

var handlers = {
    // 'NewSession': function () {
    //   console.log('new session ', JSON.stringify(this.event, null, 2));
    //   if (this.attributes[deviceId].iterating === 'show') {// seems like a state handler use case?
    //     this.attributes[deviceId].showIndex = 0;
    //   }
    // NOTE: I can easily do this and redirect... but MOST requests will be new session, so to what end?
    //   if (this.event.request.type === 'LaunchRequest') {
    //     console.log('WILL I THEN HIT the original destination?');
    //
    //   } else {
    //
    //   }
    //   this.emit(this.event.request.intent.name);
    //
    // console.log('sesh id ', boundThis.event.session.sessionId);


    // if (this.event.session.new) { // can put this in new session right? or no?
    //   sessions.insert({userId: boundThis.event.session.user.userId, sessionId: boundThis.event.session.sessionId, begin: boundThis.event.request.timestamp, userId:boundThis.event.session.user.userId})
    //     .then(function(resp){
    //       console.log('new sesh babe i tried to insert', resp);
    //       boundThis.response.speak('INSERTED A SESSION, maybe').listen("why don't you try something");
    //       // have to ask to prevent session end
    //       boundThis.emit(':responseReady');
    //
    //     })
    //     .catch(function(err){
    //       console.log('session insert fail fail', err)
    //       boundThis.response.speak('baaad insert').listen("why don't you try something");
    //       boundThis.emit(':responseReady');
    //
    //     })
    // } else {
    //   // what the fuck am i doing wrong here?
    //   console.log(typeof this.event.session.user.userId);
    //   sessions.find({hash: this.event.session.user.userId, range: boundThis.event.session.sessionId})
    //     .then(function(data){
    //       console.log("SESSIONS WHAT", data)
    //       boundThis.response.speak('bueno! FROM SESSIONS').listen("why don't you try something");
    //       boundThis.emit(':responseReady');
    //     }).catch(function(err){
    //       console.log('session fail', err)
    //       boundThis.response.speak('baaad SESSIONS').listen("why don't you try something");
    //       boundThis.emit(':responseReady');
    //
    //     })
    //
    // },


    // 'PlayLatestExplainer': function () {
    //   // this is what 'play all would do'
    //   var deviceId = util.getDeviceId.call(this);
    //   util.nullCheck.call(this, deviceId);
    //   this.emit('PickExplainer', {index: {value: 1}});
    //
    //
    // },
    // 'PickExplainer': function (slot) {
    //   // set spot in indices
    //   var deviceId = util.getDeviceId.call(this);
    //   util.nullCheck.call(this, deviceId);
    //   console.log('PICK EXPLAINER?', this.event.request)
    //   var slot = slot || this.event.request.intent.slots;
    //   console.log("SLOT",slot)
    //   feedLoader.call(this, config.testExplainerFeed, false, function(err, feedData) {
    //     console.log('successful load', feedData.items.length);
    //     var chosenExplainer = util.itemPicker(slot, feedData.items, 'title', 'topic');
    //     if (!chosenExplainer) {
    //       console.log('handle not found');
    //     }
    //     this.attributes.currentExplainerIndex = chosenExplainer.index;
    //
    //     var intro = `Here's ${chosenExplainer.author} explaining ${chosenExplainer.title}. <audio src="${chosenExplainer.audio.url}" /> `;
    //     var prompt;
    //     if (feedData.items[chosenExplainer.index+1]) {
    //       prompt = `Say 'replay' to hear that again or 'next' to learn about ${feedData.items[chosenExplainer.index+1].title} or 'list explainers' to see all.`;
    //     } else {
    //       prompt = "And that's all we have right now."
    //     }
    //     if (this.event.context.System.device.supportedInterfaces.Display) {
    //       this.response.renderTemplate(
    //         util.templateBodyTemplate3(
    //           chosenExplainer.title,
    //           chosenExplainer.image || config.icon.full,
    //           chosenExplainer.description,
    //           "<action value='ReplayExplainer'>Replay</action> | <action value='Next'>Next</action>",
    //           config.background.show
    //         )
    //       );
    //
    //       this.response.renderTemplate(util.templateBodyTemplate3('Welcome to Make Me Smart', intro, config.background.show));
    //     }
    //     var fullSpeech = intro + prompt;
    //     this.response.speak(fullSpeech).listen(prompt);
    //     this.emit(':responseReady');
    //
    //   });
    //
    // },

    'FindExplainer': function () {
        var deviceId = util.getDeviceId.call(this);
        util.nullCheck.call(this, deviceId);

        console.log("find explainer ", JSON.stringify(this.event.request,null,2));
        var query = this.event.request.intent.slots.query.value || this.event.request.intent.slots.wildcard.value;

        this.attributes.queries.push(query);
        console.log('attributes/after', this.attributes);
        // query = 'cheeseburgers'
        this.response.speak(`I'm gonna look for something on ${query}`)
            .cardRenderer(`here's what i got on ${query}.`);
        this.emit(':responseReady');
    },

    'List_explainers': function () {
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);

      console.log('list Explainers')
      console.log(JSON.stringify(this.event.request, null, 2));

      this.response.speak('we got some Explainers!')

      this.emit(':responseReady');

    },
    // "what topics it has",
    // "what's up in the world",
    // "what I should know",
    // "list explainers",
    // "list all explainers",
    // "list the explainers",
    // "all explainers",
    // "explainer list",
    // "explainers",
    // "list topics",
    // "list all topics"



    'List_shows': function () { // SHOWS AND ITEMS MIGHT BE EASILY MERGED EVENTUALLY
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);

      if (this.event.session.new || (!this.attributes.indices.show)) {
        this.attributes.indices.show = 0;
      }
      this.attributes.iterating = 'show';
      // This might be better done via the statehandler API

      var data = util.itemLister(
        feeds,
        `${this.attributes.iterating}s`,
        'feed',
        this.attributes.indices[this.attributes.iterating],
        config.items_per_prompt[this.attributes.iterating]
      );

      this.response.speak(data.itemsAudio).listen('Pick one or say next or previous to move forward or backward through list.').cardRenderer(data.itemsCard);

      if (this.event.context.System.device.supportedInterfaces.Display) {
        this.response.renderTemplate(
          util.templateListTemplate1(
            'Our Shows',
            'list-shows',
            'Show',
            'feed',
            feeds
          )
        );
      }

      this.emit(':responseReady');

      // Go into feed
    },
    'List_episodes': function (slot) {
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);

      // TODO: if we get here directly, NOT having gone through 'Pick Show', we need to do some state management
      var slot = slot || this.event.request.intent.slots;
      this.attributes.iterating = 'episode';
      this.attributes.indices.episode = this.attributes.indices.episode || 0;
      if (slot && slot.show && slot.show.value) {
        this.attributes.show = slot.show.value;
      }
      this.attributes.show = this.attributes.show || 'Make Me Smart';

      var chosen = util.itemPicker(this.attributes.show, feeds, 'feed', 'feed');
      var showImage = util.cardImage(chosen.image);
      console.time('list-episodes-load');

      feedLoader.call(this, chosen, true, function(err, feedData) {
        console.timeEnd('list-episodes-load');

        console.log('LIST EPISODES FEED LOAD cb')
        var data = util.itemLister(
          feedData.items,
          `${this.attributes.iterating}s`,
          'title',
          this.attributes.indices[this.attributes.iterating],
          config.items_per_prompt[this.attributes.iterating]
        );

        this.response.speak(data.itemsAudio).listen('Pick one or say next').cardRenderer(data.itemsCard);

        if (this.event.context.System.device.supportedInterfaces.Display) {
          this.response.renderTemplate(
            util.templateListTemplate1(
              'Episodes',
              'list-episodes',
              'Episode',
              'title',
              feedData.items
            )
          );
        }
        this.emit(':responseReady');
      });
    },
    'ElementSelected': function () {
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);

      // handle play latest or pick episode actions
      console.log('ElementSelected -- ', this.event.request)
      var intentSlot,intentName;
      if (this.event.request.token === 'PlayLatestEpisode' || this.event.request.token === 'List_episodes') {
        intentName = this.event.request.token;
        intentSlot = {
          index: {
            value: this.attributes.show
          }
        }
      }  else {
        var tokenData = this.event.request.token.split('_');
        intentName = tokenData[0];
        intentSlot = {
          index: {
            value: parseInt(tokenData[1]) + 1
          }
        }
      }
      console.log(intentName, intentSlot);
      this.emit(intentName, intentSlot);
    },
    'PickShow': function(slot) {
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);

      // also need out of bounds era on numbers, right?
      // if feeds are being iterated, should destroy that index
      // slots should be specific. show_title rather than title...
      //NOTE: what if we're not currently iterating the shows IE. someone just says "CHOOSE show x"?
      // GOTTA HANDLE FOR THAT
      // NOTE: currently putting show loading behind 1 hour cache... on testing the sendProgressive takes just as long as the damn lookup in most of the cases, so this might not be worth it.
      // NOTE: on the device, progressive comes instantly

      var slot = slot || this.event.request.intent.slots;
      var chosen = util.itemPicker(slot, feeds, 'feed', 'feed');
      this.attributes.iterating = -1;

      var showImage = util.cardImage(chosen.image);
      this.attributes.show = chosen.feed;
      this.attributes.indices.show = null;
      this.attributes.indices.episode = 0;

      console.time('pick-show-load');
      feedLoader.call(this, chosen, false, function(err, feedData) {
        console.timeEnd('pick-show-load');
        this.response.speak(`You chose ${chosen.feed}. Should I play the latest episode or list the episodes?`)
          .listen("Say 'play latest' to hear the latest episode or 'list episodes' to explore episodes.")
          .cardRenderer(chosen.feed, 'Say "play latest" to hear the latest episode or "list episodes" to explore episodes.', showImage);
        //
        if (this.event.context.System.device.supportedInterfaces.Display) {
          this.response.renderTemplate(
            util.templateBodyTemplate3(
              chosen.feed,
              chosen.image,
              chosen.description,
              "<action value='PlayLatestEpisode'>Play latest</action> | <action value='List_episodes'>List episodes</action><br/>",
              config.background.show
            )
          );
        }
        this.response.hint('play the latest episode', 'PlainText')

        console.log('RESPONSE', JSON.stringify(this.response, null, 2));
        this.emit(':responseReady');
      });


    },

    'PlayLatestEpisode' : function (slot) {
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);

      var slot = slot || this.event.request.intent.slots;

      if (slot && slot.show && slot.show.value) {
        this.attributes.show = slot.show.value;
      }

      this.attributes.iterating = -1;
      var show = this.attributes.show || 'Make Me Smart';
      var chosenShow = util.itemPicker(show, feeds, 'feed', 'feed');
      var showImage = util.cardImage(chosenShow.image);
      feedLoader.call(this, chosenShow, false, function(err, feedData) {
        console.log('PLAY LATEST feed load cb')
        var chosenEp = feedData.items[0];
        this.response.speak(`Playing the latest ${chosenShow.feed}, titled ${chosenEp.title}`);
        audioPlayer.start.call(this, chosenEp, 'episode', chosenShow.feed);
        // this.response.audioPlayerPlay('REPLACE_ALL', chosenEp.audio.url, chosenEp.guid, null, 0);
        // this.emit(':responseReady');
      });


    },


    'PickEpisode': function (slot) {
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);

      // need out of bounds error on numbers, god forbid look up by title.
      // still have to deal with play latest
      // if iterating == episodes
        // attributes.show is the show
        // slots: index, ordinal, episode_title
      // if not iterating EPISODES
        // slots: show_title should be there
        // if not, just either pick last show, or default to whatever we want.
      // need to handle if the session is over
      var slot = slot || this.event.request.intent.slots;
      this.attributes.iterating = -1;

      var show = this.attributes.show
      var chosenShow = util.itemPicker(show, feeds, 'feed', 'feed');
      console.log('Episode pick - iterating', this.attributes.iterating, ' show ', this.attributes.show);
      console.log('slots baby', slot);
      console.log(chosenShow)
      feedLoader.call(this, chosenShow, false, function(err, feedData) {
        console.log('PICK EPISODE feed load cb')
        var chosenEp = util.itemPicker(slot, feedData.items, 'title', 'title');
        console.log('PICK EPISODE', JSON.stringify(chosenEp, null, 2));
        this.response.speak(`Starting ${chosenEp.title}`);
        audioPlayer.start.call(this, chosenEp, 'episode', chosenShow.feed);
      });
    },
    // 'FinishedHandler': function () {
    //   //
    //   console.log("FINISHED HANDLER")
    //   var deviceId = util.getDeviceId.call(this);
    //   util.nullCheck.call(this, deviceId);
    //   var newItem = this.attributes.enqueued;
    //   var playing = this.attributes.playing;
    //   // console.log('DONE PLAYING!', playing);
    //   // console.log("NEW ITEM ", newItem)
    //   // console.log('THIS IN FINISHED   ', JSON.stringify(this.response, null, 2));
    //   this.response.speak(`Done. Now playing the next ${playing.type}, ${newItem.title}`);
    //   this.emit(':responseReady');
    //   // audioPlayer.start.call(this, newItem, playing.type, playing.feed)
    //
    // },

    'SessionEndedRequest' : function() {
      // save the session i guess
      console.log('Session ended with reason: ' + JSON.stringify(this.event.request, null, 2));
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      // GOTTA set playing to exit?
      if(this.attributes.iterating === 'show') {
        this.attriubutes.iterating = -1;
        if(this.attributes.indices && this.attributes.indices.show) {

          this.attributes.indices.show = 0;
        }
      }
      this.emit(':saveState', true);

    },
    // NEXT AND PREVIOUS: for now, will call explicit listEntity functions for each.
    // For now, will allow us
    'AMAZON.NextIntent' : function () {
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      console.log('NEXT called, not playing?', this.attributes.playing)
      // this.response.speak('Got the next call')
      // this.emit(':responseReady');
      console.log("NEXT ", this.attributes.currentExplainerIndex)
      // if we're iterating something, move next
      if (this.attributes.iterating !== -1) {
        console.log('we ARE iterating')

        this.attributes.indices[this.attributes.iterating] += config.items_per_prompt[this.attributes.iterating];
        this.emit(':saveState', true);
        this.emit(`List_${this.attributes.iterating}s`);
      } else if (this.attributes.currentExplainerIndex !== -1) {
        // currentExplainerIndex is 0 based, and PickExplainer expects 1-based
        this.emit('PickExplainer', {index: {value: this.attributes.currentExplainerIndex+2}});
      } else if (this.attributes.playing) {
        console.log('we are not iterating', this.attributes.playing.type)
        var chosenShow;
        if (this.attributes.playing.type === 'episode') {
          chosenShow = util.itemPicker(this.attributes.playing.feed, feeds, 'feed', 'feed');
        }
        var boundThis = this;
        console.log('chosenShow', chosenShow)
        feedLoader.call(boundThis, chosenShow, false, function(err, feedData) {
          console.log('WHAT', feedData.items)
          var nextEp = util.nextPicker(boundThis.attributes.playing, 'token', feedData.items, 'guid');
          //
          if (nextEp === -1) {
            console.log('handle no next')
          }
          var nextSpeech = 'Okay. '
          switch(this.attributes.playing.status) {
            case 'playing':
              nextSpeech += `Skipping to the next ${boundThis.attributes.playing.feed}, titled ${nextEp.title}.`;
              console.log("you were playing")
              break;
            case 'finished':
              nextSpeech += `Last time you finished hearing ${boundThis.attributes.playing.title}. I'll play the next ${boundThis.attributes.playing.type}.`;
              break;
            // case 'requested':
            //   console.log("you requested")
            //   break;
            // case 'paused':
            //   console.log("paused")
            //   break;
            // case 'failed':
            //
            //   console.log("you failed")
            //   break;
            default:
              nextSpeech += `Playing the next ${boundThis.attributes.playing.feed}, titled ${nextEp.title}.`;
              break;
          }
          this.response.speak(nextSpeech);
          audioPlayer.start.call(this, nextEp, boundThis.attributes.playing.type, chosenShow.feed);
        });


      } else {
        // if I'm not iterating and I'm not playing, just go home.

        this.emit('LaunchRequest');
      }
      //




      // if playing.status === playing
        // FUCK THE ENQUEUED, just find it again
        // load feed, find next, send play with REPLACE_ALL
        // nuke enqueued?
      // else
        // do below

    },
    'AMAZON.PreviousIntent' : function () {
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      // if playing
        // i guess find previous, play that? nuke enqueued
      // else
      this.attributes.indices[this.attributes.iterating] -= config.items_per_prompt[this.attributes.iterating];
      // if it's less than zero, reset to zero
      console.log('after PREVIOUS FIRES',this.attributes.indices);
      this.emit(':saveState', true);

      console.log("PREVIOUS FIRES ");

      this.emit(`List_${this.attributes.iterating}s`);
    },

    'AMAZON.PauseIntent' : function () {
        // TEST
        this.response.speak('Paused it for you');
        audioPlayer.stop.call(this);
    },

    'AMAZON.ResumeIntent' : function () {
      console.log('buit in RESUME');

      // MUST CHECK FINISHED:
        // if playing was finished,
          // find next, give message, play
        // else
          // if ep, and playing within 30 * 1000 of end, go to next
          // else, resume
      audioPlayer.resume.call(this);
    },

    'AMAZON.StopIntent' : function() {
      console.log('built in STOP')
      // This needs to work for not playing as well
      audioPlayer.stop.call(this);
      this.emit(':responseReady');
    },


    'AMAZON.ScrollDownIntent': function () {
      console.log('AMAZON.ScrollDownIntent');
    },
    'AMAZON.HelpIntent' : function() {
      // get real things
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
