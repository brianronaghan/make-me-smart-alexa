'use strict';
var Alexa = require("alexa-sdk");
var config = require('./config');
var util = require('./util');
var feedHelper = require('./feedHelpers');
var feeds = config.feeds;
var audioEventHandlers = require('./audioEventHandlers');
var audioPlayer = require('./audioPlayer')
var dynasty = require('dynasty')({ region: process.env.AWS_DEFAULT_REGION });
var sessions = dynasty.table(config.sessionDBName);
var itemLister = util.itemLister;
var itemPicker = util.itemPicker;
var sendProgressive = util.sendProgressive;

var feedLoader = feedHelper.feedLoader;
let items = [];
// var users = dynasty.table('makeMeSmart');

var testExplainers = {
  feed: 'Explainers',
  url: null,
  image:null,
  items: [{
      title: 'bonds',
      guid: 'https://s3.amazonaws.com/alexa-marketplace-make-me-smart/test-explainers/Alexa-Bonds-Kai.MP3',
      date: null,
      description: 'describing some bonds',
      audio: {
        url: "https://s3.amazonaws.com/alexa-marketplace-make-me-smart/test-explainers/Alexa-Bonds-Kai.MP3",
        length: null,
        type: null
      }
    },
    {
      title: 'inflation',
      guid: 'https://s3.amazonaws.com/alexa-marketplace-make-me-smart/test-explainers/Alexa-Inflation-Kai.MP3',
      date: null,
      description: 'describing some inflation',
      audio: {
        url: "https://s3.amazonaws.com/alexa-marketplace-make-me-smart/test-explainers/Alexa-Inflation-Kai.MP3",
        length: null,
        type: null
      }
    },
    {
      title: 'interest rates',
      guid: "https://s3.amazonaws.com/alexa-marketplace-make-me-smart/test-explainers/Alexa-Interest-Rates-Kai.MP3",
      date: null,
      description: 'describing some interest rates',
      audio: {
        url: "https://s3.amazonaws.com/alexa-marketplace-make-me-smart/test-explainers/Alexa-Interest-Rates-Kai.MP3",
        length: null,
        type: null
      }
    },
    {
      title: 'productivity',
      guid: "https://s3.amazonaws.com/alexa-marketplace-make-me-smart/test-explainers/Alexa-Productivity-Kai.MP3",
      date: null,
      description: 'describing some productivity',
      audio: {
        url: "https://s3.amazonaws.com/alexa-marketplace-make-me-smart/test-explainers/Alexa-Productivity-Kai.MP3",
        length: null,
        type: null
      }
    },
    {
      title: 'the cloud',
      guid: "https://s3.amazonaws.com/alexa-marketplace-make-me-smart/test-explainers/Alexa-The-Cloud-Molly+Wood.MP3",
      date: null,
      description: 'describing the cloud',
      audio: {
        url: "https://s3.amazonaws.com/alexa-marketplace-make-me-smart/test-explainers/Alexa-The-Cloud-Molly+Wood.MP3",
        length: null,
        type: null
      }
    }
  ]
}

var episodes = {};
var explainers = [];

let showImage;

exports.handler = function(event, context) {
    var alexa = Alexa.handler(event, context);
    alexa.appId = config.appId;
    alexa.dynamoDBTableName = config.dynamoDBTableName;
    alexa.registerHandlers(handlers, audioEventHandlers);
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
    // console.log('MY USER ATTRIBUTE', this.attributes[deviceId]);
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

    'LaunchRequest': function () {
      var deviceId = util.getDeviceId.call(this);
      var intro = `Welcome ${this.attributes[deviceId] ? 'back' : ''} to Make Me Smart.`

      util.nullCheck.call(this, deviceId);

      // var params = {
      //   TableName: 'makeMeSmart',
      //   Key: {'userId': this.event.session.user.userId}
      // };
      // var session_params = {
      //   TableName: 'sessions',
      //   Key: {'userId': this.event.session.user.userId, sessionStart: this.event.request.timestamp}
      // };

      // if you were playing episode

      // if you were playing explainer

      // ELSE

      var boundThis = this;
      console.log('test explainers', testExplainers)
      var topics = testExplainers.items.map(function(item) {
        return item.title
      });
      intro += `This week we're learning about <prosody pitch="high" volume="x-loud">${topics[0]}</prosody>, <prosody volume="x-loud" pitch="high">${topics[1]}</prosody>, and <prosody volume="x-loud" pitch="high" >${topics[2]}</prosody>. To skip to the next explanation at any time say 'next'.`;
      this.response.speak(intro).cardRenderer(intro);

      if (this.event.context.System.device.supportedInterfaces.Display) {
        this.response.renderTemplate(util.templateBodyTemplate1('Welcome to Make Me Smart', intro, "https://photos-1.dropbox.com/t/2/AACQSoCkPgxU97c9x553OYPj3NiYF1Q_Ta5qcI68gvZQpA/12/20237196/png/32x32/3/1519963200/0/2/1024x600_optB.png/ELfalA8Yre4YIAIoAg/2GMa2nEjkJ1EhjNaqq80RQuKevxZTkH0yFB_GVmJ6Go?dl=0&preserve_transparency=1&size=2048x1536&size_mode=3"));
      }
      console.log("LAUNCH REQUEST ", this.event.context.System.device.deviceId )
      this.response.hint('ahhh', 'PlainText');
      // I'll have to enqueue all three I guess? THIS IS

      this.emit(':responseReady');

    },
    'ResumeEpisode': function () {

    },
    'ResumeExplainer': function () {

    },
    'FindExplainer': function () {
        var deviceId = util.getDeviceId.call(this);
        util.nullCheck.call(this, deviceId);

        console.log("find explainer ", JSON.stringify(this.event.request,null,2));
        var query = this.event.request.intent.slots.query.value || this.event.request.intent.slots.wildcard.value;

        this.attributes[deviceId].queries.push(query);
        console.log('attributes/after', this.attributes[deviceId]);
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

      if (this.event.session.new || (!this.attributes[deviceId].indices.show)) {
        this.attributes[deviceId].indices.show = 0;
      }
      this.attributes[deviceId].iterating = 'show';
      // This might be better done via the statehandler API

      var data = itemLister(
        feeds,
        `${this.attributes[deviceId].iterating}s`,
        'feed',
        this.attributes[deviceId].indices[this.attributes[deviceId].iterating],
        config.items_per_prompt[this.attributes[deviceId].iterating]
      );

      this.response.speak(data.itemsAudio).listen('Pick one or move forward or backward through list.').cardRenderer(data.itemsCard);

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
      this.attributes[deviceId].iterating = 'episode';
      this.attributes[deviceId].indices.episode = this.attributes[deviceId].indices.episode || 0;
      if (slot && slot.show && slot.show.value) {
        this.attributes[deviceId].show = slot.show.value;
      }
      this.attributes[deviceId].show = this.attributes[deviceId].show || 'Make Me Smart';

      var chosen = itemPicker(this.attributes[deviceId].show, feeds, 'feed');
      var showImage = util.cardImage(chosen.image);
      console.time('list-episodes-load');

      feedLoader.call(this, chosen, true, function(err, feedData) {
        console.timeEnd('list-episodes-load');

        console.log('LIST EPISODES FEED LOAD cb')
        var data = util.itemLister(
          feedData.items,
          `${this.attributes[deviceId].iterating}s`,
          'title',
          this.attributes[deviceId].indices[this.attributes[deviceId].iterating],
          config.items_per_prompt[this.attributes[deviceId].iterating]
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
      console.log('ATTRIBUTES?', this.attributes[deviceId])
      var intentSlot,intentName;
      if (this.event.request.token === 'PlayLatestEpisode' || this.event.request.token === 'List_episodes') {
        intentName = this.event.request.token;
        intentSlot = {
          index: {
            value: this.attributes[deviceId].show
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
      console.log("PICK SHOW");
      var slot = slot || this.event.request.intent.slots;
      var chosen = itemPicker(slot, feeds, 'feed');
      this.attributes[deviceId].iterating = -1;

      var showImage = util.cardImage(chosen.image);
      this.attributes[deviceId].show = chosen.feed;
      this.attributes[deviceId].indices.show = null;
      this.attributes[deviceId].indices.episode = 0;

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
              "https://photos-1.dropbox.com/t/2/AACQSoCkPgxU97c9x553OYPj3NiYF1Q_Ta5qcI68gvZQpA/12/20237196/png/32x32/3/1519963200/0/2/1024x600_optB.png/ELfalA8Yre4YIAIoAg/2GMa2nEjkJ1EhjNaqq80RQuKevxZTkH0yFB_GVmJ6Go?dl=0&preserve_transparency=1&size=2048x1536&size_mode=3"

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
        this.attributes[deviceId].show = slot.show.value;
      }

      this.attributes[deviceId].iterating = -1;
      var show = this.attributes[deviceId].show || 'Make Me Smart';
      var chosenShow = itemPicker(show, feeds, 'feed');
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
      this.attributes[deviceId].iterating = -1;

      var show = this.attributes[deviceId].show
      var chosenShow = itemPicker(show, feeds, 'feed');
      console.log('Episode pick - iterating', this.attributes[deviceId].iterating, ' show ', this.attributes[deviceId].show);
      console.log('slots baby', slot);
      console.log(chosenShow)
      feedLoader.call(this, chosenShow, false, function(err, feedData) {
        console.log('PICK EPISODE feed load cb')
        var chosenEp = itemPicker(slot, feedData.items, 'title');
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
    //   var newItem = this.attributes[deviceId].enqueued;
    //   var playing = this.attributes[deviceId].playing;
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
      if(this.attributes[deviceId].iterating === 'show') {
        this.attriubutes[deviceId].iterating = -1;
        if(this.attributes[deviceId].indices && this.attributes[deviceId].indices.show) {

          this.attributes[deviceId].indices.show = 0;
        }
      }
      this.emit(':saveState', true);

    },
    // NEXT AND PREVIOUS: for now, will call explicit listEntity functions for each.
    // For now, will allow us
    'AMAZON.NextIntent' : function () {
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      console.log('NEXT called, not playing?', this.attributes[deviceId].playing)
      console.log("UM WHAT THE FUK EVENT: ", this.event)
      // this.response.speak('Got the next call')
      // this.emit(':responseReady');
      console.log('HOPEFULLY NON EXISTENT', this.attributes[deviceId].iterating)
      console.log('null', this.attributes[deviceId].iterating === -1)

      // if we're iterating something, move next
      if (this.attributes[deviceId].iterating !== -1) {
        console.log('we ARE iterating')

        this.attributes[deviceId].indices[this.attributes[deviceId].iterating] += config.items_per_prompt[this.attributes[deviceId].iterating];
        this.emit(':saveState', true);
        this.emit(`List_${this.attributes[deviceId].iterating}s`);
      } else if (this.attributes[deviceId].playing) {
        console.log('we are not iterating')
        var chosenShow = util.itemPicker(this.attributes[deviceId].playing.feed, feeds, 'feed');
        var boundThis = this;

        feedLoader.call(this, chosenShow, false, function(err, feedData) {
          var nextEp = util.nextPicker(boundThis.attributes[deviceId].playing, 'token', feedData.items, 'guid');
          //
          if (nextEp === -1) {
            console.log('handle no next')
          }
          var nextSpeech = 'Okay. '
          switch(this.attributes[deviceId].playing.status) {
            case 'playing':
              nextSpeech += `Skipping to the next ${boundThis.attributes[deviceId].playing.feed}, titled ${nextEp.title}.`;
              console.log("you were playing")
              break;
            case 'finished':
              nextSpeech += `Last time you finished hearing ${boundThis.attributes[deviceId].playing.title}. I'll play the next ${boundThis.attributes[deviceId].playing.type}.`;
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
              nextSpeech += `Playing the next ${boundThis.attributes[deviceId].playing.feed}, titled ${nextEp.title}.`;
              break;
          }
          this.response.speak(nextSpeech);
          audioPlayer.start.call(this, nextEp, boundThis.attributes[deviceId].playing.type, chosenShow.feed);
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
      this.attributes[deviceId].indices[this.attributes[deviceId].iterating] -= config.items_per_prompt[this.attributes[deviceId].iterating];
      // if it's less than zero, reset to zero
      console.log('after PREVIOUS FIRES',this.attributes[deviceId].indices);
      this.emit(':saveState', true);

      console.log("PREVIOUS FIRES ");

      this.emit(`List_${this.attributes[deviceId].iterating}s`);
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
