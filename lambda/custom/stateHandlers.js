'use strict';

var Alexa = require('alexa-sdk');

var config = require('./config');
var util = require('./util');
var feeds = config.feeds;

var feedHelper = require('./feedHelpers');
var feedLoader = feedHelper.feedLoader;




var stateHandlers = {
  startModeHandlers : Alexa.CreateStateHandler(config.states.START_MODE, {
    // 'NewSession': function () {
    // //   console.log('new session ', JSON.stringify(this.event, null, 2));
    // },
    'LaunchRequest': function () {
      var deviceId = util.getDeviceId.call(this);
      var intro = `Welcome ${this.attributes.deviceId ? 'back' : ''} to Make Me Smart. `;
      util.nullCheck.call(this, deviceId);

      // if you were playing episode

      // if you were playing explainer

      // ELSE
      console.log(this.attributes)
      this.handler.state = config.states.EXPLAINERS;
      this.attributes.STATE = config.states.EXPLAINERS;
      var boundThis = this;
      feedLoader.call(this, config.testExplainerFeed, false, function(err, feedData) {
        var topics = feedData.items.map(function(item) {
          return item.title
        });
        intro += `This week we're learning about <prosody pitch="high" volume="x-loud">1) ${topics[0]}</prosody>, <prosody volume="x-loud" pitch="high">2) ${topics[1]}</prosody>, and <prosody volume="x-loud" pitch="high">3) ${topics[2]}</prosody>. Pick one, or say 'play all' to learn about all of them.`;

        // set iterating to explainers

        // On add the and that was to the speech... not for card'
        var links = "<action value='PlayLatestExplainer'>Play All</action>";
        this.response.speak(intro).listen("Pick one, or say 'play all' to learn about all of them.");
        if (this.event.context.System.device.supportedInterfaces.Display) {
          this.response.renderTemplate(util.templateBodyTemplate1('Welcome to Make Me Smart', intro, links, config.background.show));
        }
        // this.emit(':elicitSlot', 'topic', intro, "Pick one, or say 'play all' to learn about all of them.");
        this.emit(':saveState', true);
        // audioPlayer.start.call(this, feedData.items[0], 'explainer', 'explainers');

      });
    }
  }),
  explainerModeHandlers : Alexa.CreateStateHandler(config.states.EXPLAINERS, {
    'LaunchRequest': function () {
      var deviceId = util.getDeviceId.call(this);
      var intro = `Welcome ${this.attributes.deviceId ? 'back' : ''} to Make Me Smart. `;
      util.nullCheck.call(this, deviceId);

      // if you were playing episode

      // if you were playing explainer

      // ELSE
      console.log(this.attributes)
      if (!this.attributes.currentExplainerIndex || this.attributes.currentExplainerIndex === -1) {
        console.log('no explainer index SWITCHING STATE');
        this.handler.state = config.states.START;
        this.attributes.STATE = config.states.START;
        return this.emitWithState('LaunchRequest')
      }
      var boundThis = this;
      feedLoader.call(this, config.testExplainerFeed, false, function(err, feedData) {
        var previousExplainer = feedData.items[this.attributes.currentExplainerIndex];

        intro += `Last time you were learning about ${previousExplainer.title}. Say 'restart' to hear that again or what is new to here the latest topics.`;

        // set iterating to explainers

        // On add the and that was to the speech... not for card'
        var links = "<action value='PlayLatestExplainer'>Play All</action>";
        this.response.speak(intro).listen("Pick one, or say 'play all' to learn about all of them.");
        if (this.event.context.System.device.supportedInterfaces.Display) {
          this.response.renderTemplate(util.templateBodyTemplate1('Welcome to Make Me Smart', intro, links, config.background.show));
        }
        // this.emit(':elicitSlot', 'topic', intro, "Pick one, or say 'play all' to learn about all of them.");
        this.emit(':saveState', true);
        // audioPlayer.start.call(this, feedData.items[0], 'explainer', 'explainers');

      });
    },
    'PickExplainer': function (slot) {
      // set spot in indices
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      console.log('PICK EXPLAINER --> state?', this.handler.state, this.attributes.state)
      var slot = slot || this.event.request.intent.slots;
      feedLoader.call(this, config.testExplainerFeed, false, function(err, feedData) {
        var chosenExplainer = util.itemPicker(slot, feedData.items, 'title', 'topic');
        if (!chosenExplainer) {
          console.log('WE REACHED END');
        }
        this.attributes.currentExplainerIndex = chosenExplainer.index;

        var intro = `Here's ${chosenExplainer.author} explaining ${chosenExplainer.title}. <audio src="${chosenExplainer.audio.url}" /> `;
        var prompt;
        var links = "<action value='ReplayExplainer'>Replay</action>";
        if (feedData.items[chosenExplainer.index+1]) {
          prompt = `Say 'replay' to hear that again or 'next' to learn about ${feedData.items[chosenExplainer.index+1].title}`;
          links += " | <action value='Next'>Next</action>",

        } else {
          prompt = "And that's all we have right now. Say 'replay' to hear that again or 'list explainers' to see all."
          links += " | <action value='List_explainers'>See all</action>",

        }
        // DO NOT PUT NEXT ON if it's the end
        if (this.event.context.System.device.supportedInterfaces.Display) {
          this.response.renderTemplate(
            util.templateBodyTemplate3(
              chosenExplainer.title,
              chosenExplainer.image || config.icon.full,
              chosenExplainer.description,
              links,
              config.background.show
            )
          );
        }
        var fullSpeech = intro + prompt;
        this.response.speak(fullSpeech).listen(prompt);
        this.emit(':saveState', true);
      });

    },
    // 'RegisterExplainerSearch': function () {
    //
    // },
    'PlayLatestExplainer': function () {
      // this is what 'play all would do'
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      this.emitWithState('PickExplainer', {index: {value: 1}});


    },
    'ReplayExplainer': function () {
      console.log("REPLAY?")
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      console.log('GOT REPLAY', this.handler.state)
      // currentExplainerIndex is 0 based, and PickExplainer expects 1-based
      this.emitWithState('PickExplainer', {index: {value: this.attributes.currentExplainerIndex + 1}})
    },
    'AMAZON.NextIntent' : function () {
      // only in explainer mode, right?
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      console.log("NEXT ", this.attributes.currentExplainerIndex)
      console.log('handler state', this.handler.state)
      console.log('attributes state', this.attributes.state)

      // currentExplainerIndex is 0 based, and PickExplainer expects 1-based
      this.emitWithState('PickExplainer', {index: {value: this.attributes.currentExplainerIndex+2}});

      // if we're iterating something, move next

    },
    'AMAZON.PreviousIntent' : function () {
      // only in explainer mode, right?
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      console.log("PREVIOUS ", this.attributes.currentExplainerIndex)
      console.log('handler state', this.handler.state)
      console.log('attributes state', this.attributes.state)

      // currentExplainerIndex is 0 based, and PickExplainer expects 1-based
      this.emitWithState('PickExplainer', {index: {value: this.attributes.currentExplainerIndex}});

      // if we're iterating something, move next

    },
    'List_explainers': function () {
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);

      console.log('list Explainers')
      console.log(JSON.stringify(this.event.request, null, 2));

      this.handler.state = config.states.ITERATING_EXPLAINERS;
      this.attributes.STATE = config.states.ITERATING_EXPLAINERS;
      // this just throws to the correct state version of itself
      this.emitWithState(':List_explainers');

    },
    // DEFAULT:
    'SessionEndedRequest' : function () {
      console.log("SESSION ENDED IN EXPLAINER STATE")
     },
     'Unhandled' : function () {
         var message = 'You were getting smart but something went wrong . What now?';
         this.response.speak(message).listen(message);
         this.emit(':responseReady');
     }

  }),
  iteratingExplainerModeHandlers : Alexa.CreateStateHandler(config.states.ITERATING_EXPLAINERS, {
    'List_explainers': function () {
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      if (this.event.session.new || (!this.attributes.indices.show)) {
        this.attributes.indices.explainer = 0;
      }
      // NOTE: here:


    },
    'SessionEndedRequest' : function () {
      console.log("SESSION ENDED IN ITERATING EXPLAINER")
     },
     'Unhandled' : function () {
       console.log("UNHANDLERD ITERATING EXPLAINER");
         var message = 'UNDHANDLED ITER EXPLA What now?';
         this.response.speak(message).listen(message);
         this.emit(':responseReady');
     }


  }),
  iteratingShowModeHandlers : Alexa.CreateStateHandler(config.states.ITERATING_SHOWS, {
  }),
  iteratingEpsModeHandlers : Alexa.CreateStateHandler(config.states.ITERATING_EPS, {
  }),
  playingEpsModeHandlers : Alexa.CreateStateHandler(config.states.PLAYING_EPS, {

  }),

}



module.exports = stateHandlers;
