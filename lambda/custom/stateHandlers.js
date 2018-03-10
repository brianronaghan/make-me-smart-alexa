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
      this.handler.state = config.states.EXPLAINERS;
      this.attributes.state = config.states.EXPLAINERS;
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
    },
    'FindExplainer': function () {
        // make sure it only goes here if it can't find something?
        var deviceId = util.getDeviceId.call(this);
        util.nullCheck.call(this, deviceId);

        console.log("START MODE, FIND EXPLAINER  ", JSON.stringify(this.event.request,null,2));
        var query = this.event.request.intent.slots.query.value || this.event.request.intent.slots.wildcard.value;

        this.attributes.queries.push(query);
        // if found, go to pick explainer
        // if not found, go to request
        console.log('attributes/after', this.attributes);
        // query = 'cheeseburgers'
        this.response.speak(`I'm gonna look for something on ${query}`)
            .cardRenderer(`here's what i got on ${query}.`);
        this.emit(':responseReady');
    },
    'RequestExplainer': function () {
      //
      var message = `Hm, we don't have anything on ${query}. But I'll ask Kai and Molly to look into it.`;
      // then elicit name/location/email

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
        console.log('no explainer index SWITCHING state');
        this.handler.state = config.states.START;
        this.attributes.state = config.states.START;
        return this.emitWithState('LaunchRequest')
      }
      var boundThis = this;
      feedLoader.call(this, config.testExplainerFeed, false, function(err, feedData) {
        var previousExplainer = feedData.items[this.attributes.currentExplainerIndex];

        intro += `Last time you were learning about ${previousExplainer.title}. Say 'restart' to hear that again or 'what's new' to here the latest explainers.`;

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
    'HomePage': function () {
      this.attributes.currentExplainerIndex = 0;
      this.handler.state = config.states.START;
      this.attributes.state = config.states.START;
      return this.emitWithState('LaunchRequest')

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
        if (feedData.items[chosenExplainer.index+1]) { // handle if end of explainer feed
          prompt = `Say 'replay' to hear that again or 'next' to learn about ${feedData.items[chosenExplainer.index+1].title}`;
          links += " | <action value='Next'>Next</action>";

        } else {
          prompt = "And that's all we have right now. Say 'replay' to hear that again or 'list explainers' to see all."
          links += " | <action value='ListExplainers'>See all</action>";
        }

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
        console.log('END OF PICK EXPLAINER handler is ', this.handler.state, ' atts is ',this.attributes.state)
        this.emit(':saveState', true);
      });

    },

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
    // STATE TRANSITION:

    'ListExplainers': function () {
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);

      console.log('list Explainers FROM Playing explainers')
      console.log(JSON.stringify(this.event.request, null, 2));
      this.attributes.currentExplainerIndex = -1;
      this.attributes.indices.explainer = 0;
      this.handler.state = config.states.ITERATING_EXPLAINERS;
      this.attributes.state = config.states.ITERATING_EXPLAINERS;
      // this just throws to the correct state version of itself
      this.emitWithState('ListExplainers');

    },

    // TOUCH EVENTS:
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

    // BUILT INS:
    'AMAZON.NextIntent' : function () {
      // only in explainer mode, right?
      console.log("NEXT!!!! EXPLAINER", this.handler.state)
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      console.log("NEXT ", this.attributes.currentExplainerIndex)
      console.log('handler state', this.handler.state)
      console.log('attributes state', this.attributes.state)
      // handle next at end of list?
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
    'AMAZON.StopIntent' : function() {
      console.log('STOP EXPLAINER STATE')
      // This needs to work for not playing as well
      this.response.speak('See you later. Say alexa, make me smart to get learning again.')
      this.emit(':saveState');
    },
    // DEFAULT:
    'SessionEndedRequest' : function () {
      console.log("SESSION ENDED IN EXPLAINER state")
     },
     'Unhandled' : function () {
         var message = 'UNHANDLED EXPLAINERS . What now?';
         this.response.speak(message).listen(message);
         this.emit(':responseReady');
     }

  }),
  iteratingExplainerModeHandlers : Alexa.CreateStateHandler(config.states.ITERATING_EXPLAINERS, {
    'ListExplainers': function () {
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      console.log('this.event.session.new',this.event.session.new)
      console.log("ITERATING EXPLAINERS LIST -> explainer idx", this.attributes.indices.explainer)

      if (this.event.session.new || (!this.attributes.indices.explainer)) { // is this logic correct?
        this.attributes.indices.explainer = 0;
      }
      feedLoader.call(this, config.testExplainerFeed, false, function(err, feedData) {
        console.log('feedData', feedData.items.length)
        var data = util.itemLister(
          feedData.items,
          `explainers`,
          'title',
          this.attributes.indices.explainer,
          config.items_per_prompt.explainer
        );
        this.response.speak(data.itemsAudio).listen('Pick one or say next or previous to move forward or backward through list.').cardRenderer(data.itemsCard);
        if (this.event.context.System.device.supportedInterfaces.Display) {
          this.response.renderTemplate(
            util.templateListTemplate1(
              'Explainers',
              'list-explainers',
              'Explainer',
              'title',
              feedData.items
            )
          );
        }
        this.emit(':responseReady');
      });

    },
    // STATE TRANSITIONS
    'PickExplainer': function (slot) {
      console.log('ITERATING EXPLAINER, pick explainer');
      console.log('manual slot', slot);
      console.log('alexa',this.event.request);

      this.handler.state = config.states.EXPLAINERS;
      this.attributes.state = config.states.EXPLAINERS;
      this.emitWithState('PickExplainer', slot);
    },
    // TOUCH EVENTS
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

    // BUILT IN
    'AMAZON.NextIntent' : function () {
      console.log("iterating explainers NEXT")
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      this.attributes.indices.explainer += config.items_per_prompt.explainer;
      console.log('THIS ATTRIBUTES ON NEXT', this.attributes)
      this.emitWithState('ListExplainers');

    },
    'AMAZON.PreviousIntent' : function () {
      console.log('iterating explainers previous')
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      this.attributes.indices.explainer -= config.items_per_prompt.explainer;
      // if
      if (this.attributes.indices.explainer < 0) {
        this.attributes.indices.explainer = 0;
      }
      this.emitWithState('ListExplainers');

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
