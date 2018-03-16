'use strict';

var Alexa = require('alexa-sdk');

var config = require('./config');
var util = require('./util');
var feeds = config.feeds;

var feedHelper = require('./feedHelpers');
var feedLoader = feedHelper.feedLoader;

var audioPlayer = require('./audioPlayer')

/*
startHandlers
playingExplainerHandlers


*/

var stateHandlers = {
  startHandlers : Alexa.CreateStateHandler(config.states.START, {
    // 'NewSession': function () {
    // //   console.log('new session ', JSON.stringify(this.event, null, 2));
    // },
    'LaunchRequest': function (condition, message) {
      console.log('con passed in', condition)
      console.log('LAUNCH in, START STATE. handler state', this.handler.state, ' atty state', this.attributes.STATE)

      // If they were previously palying an ep...?
      // If they were previouslt explainer
      // for iterating, fuck it.

      var deviceId = util.getDeviceId.call(this);
      var intro = '';
      console.log('con --> ', condition, message)
      if (!condition) {
        intro += `Welcome ${this.attributes.deviceId ? 'back' : ''} to Make Me Smart. This week `;
      } else if (condition === 'requested') {
        if (message) {
          intro += `${message} `;
        }
        intro += 'In the meantime, ';
      } else if (condition === 'no_welcome') {
        intro += 'This week ';
      }
      util.nullCheck.call(this, deviceId);
      this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
      var boundThis = this;
      feedLoader.call(this, config.testExplainerFeed, false, function(err, feedData) {
        var topics = feedData.items.map(function(item) {
          return item.title
        });
        intro += `we're learning about <prosody pitch="high" volume="x-loud">1) ${topics[0]}</prosody>, <prosody volume="x-loud" pitch="high">2) ${topics[1]}</prosody>, and <prosody volume="x-loud" pitch="high">3) ${topics[2]}</prosody>. Pick one, or say 'play all' to learn about all of them.`;

        // set iterating to explainers

        // On add the and that was to the speech... not for card'
        var links = "<action value='PlayLatestExplainer'>Play All</action>";
        this.response.speak(intro).listen("Pick one, or say 'play all' to learn about all of them.");
        if (this.event.context.System.device.supportedInterfaces.Display) {
          this.response.renderTemplate(util.templateBodyTemplate1('Welcome to Make Me Smart', intro, links, config.background.show));
        }
        // this.emit(':elicitSlot', 'userLocation', intro, "Let me know where they're from.");
        this.emit(':saveState', true);
        // audioPlayer.start.call(this, feedData.items[0], 'explainer', 'explainers');

      });
    },
    'PickItem': function () {
      console.log("PICK IN START MODE");
      console.log(JSON.stringify(this.event.request, null,2));
      this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
      this.emitWithState('PickItem');
    },

    // STATE TRANSITION

    'ListShows' : function () {
      this.handler.state = this.attributes.STATE = config.states.ITERATING_SHOW;
      console.log('list shows from start');
      this.emitWithState('ListShows');
    },


    'SessionEndedRequest' : function () {
      console.log("SESSION ENDED IN START")
     },
     'Unhandled' : function () {
       console.log("START UNHANDLED ",JSON.stringify(this.event.request,null, 2));
         var message = 'UNDHANDLED Start';
         this.response.speak(message).listen(message);
         this.emit(':responseReady');
     }
  }),
  requestHandlers : Alexa.CreateStateHandler(config.states.REQUEST, {
    'PickItem': function (slot) {
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      var slot = slot || this.event.request.intent.slots;
      var message = '';
      var message;
      var boundThis = this;
      if (this.attributes.userName && this.attributes.userLocation && false) { // NOTE: turn off for test/build if we've already got your info
        message = `Hmmm, we don't have anything on ${slot.query.value}. But I'll tell Kai and Molly that ${this.attributes.userName} from ${this.attributes.userLocation} wants to get smart about that!`;
        this.attributes.requests.push({
          timestamp: Date.now(),
          query: slot.query.value,
          name: this.attributes.userName,
          location: this.attributes.userLocation
        });
        this.handler.state = this.attributes.STATE = config.states.START;
        util.sendProgressive(
          this.event.context.System.apiEndpoint, // no need to add directives params
          this.event.request.requestId,
          this.event.context.System.apiAccessToken,
          message,
          function (err) {
            console.log('progressive cb')
            if (err) {
              boundThis.emitWithState('LaunchRequest', 'requested', message);
            } else {
              boundThis.emitWithState('LaunchRequest', 'requested');
            }
          }
        );
      } else if (!slot.userName.value && !this.attributes.userName) {
        message += `Hmmm, we don't have anything on ${slot.query.value}. But I'll ask Kai and Molly to look into it. Who should I say is asking?`;
        this.emit(':elicitSlot', 'userName', message, "Let me know what name to leave.");
      } else if (!slot.userLocation.value && this.attributes.userLocation) {
        this.attributes.userName = slot.userName.value;
        message += 'And where are you from?';
        this.emit(':elicitSlot', 'userLocation', message, "Let me know what location to leave.");
      } else {
        this.attributes.userLocation = slot.userLocation.value;
        this.handler.state = this.attributes.STATE = config.states.START;
        this.attributes.requests.push({
          timestamp: Date.now(),
          query: slot.query.value,
          name: slot.userName.value,
          location: slot.userLocation.value
        });
        var confirmationMessage =  `Okay, I'll tell Kai and Molly that ${slot.userName.value} from ${slot.userLocation.value} asked for an explainer about ${slot.query.value}.`;
        util.sendProgressive(
          this.event.context.System.apiEndpoint, // no need to add directives params
          this.event.request.requestId,
          this.event.context.System.apiAccessToken,
          confirmationMessage,
          function (err) {
            if (err) {
              boundThis.emitWithState('LaunchRequest', 'requested', confirmationMessage);
            } else {
              boundThis.emitWithState('LaunchRequest', 'requested');
            }
          }
        );
      }
    },

    'SessionEndedRequest' : function () {
      console.log("SESSION ENDED IN REQUEST")
     },
     'Unhandled' : function () {
       console.log("REQUEST unhandler -> event  ",JSON.stringify(this.event.request,null, 2));
         var message = 'UNDHANDLED REQUEST What now?';
         this.response.speak(message).listen(message);
         this.emit(':responseReady');
     }

  }),
  playingExplainerHandlers : Alexa.CreateStateHandler(config.states.PLAYING_EXPLAINER, {
    'LaunchRequest': function () {
      var deviceId = util.getDeviceId.call(this);
      var intro = `Welcome ${this.attributes.deviceId ? 'back' : ''} to Make Me Smart. `;
      util.nullCheck.call(this, deviceId);

      // if you were playing episode

      // if you were playing explainer

      // ELSE
      console.log('LAUNCH IN EXPLAINER STATE');
      // console.log('handler state', this.handler.state, ' atty state', this.attributes.STATE)
      if (!this.attributes.currentExplainerIndex || this.attributes.currentExplainerIndex === -1) {
        console.log('no explainer index SWITCHING state');
        this.handler.state = config.states.START;
        this.attributes.STATE = config.states.START;
        return this.emitWithState('LaunchRequest')
      }
      var boundThis = this;
      feedLoader.call(this, config.testExplainerFeed, false, function(err, feedData) {
        var previousExplainer = feedData.items[this.attributes.currentExplainerIndex];

        intro += `Last time you were learning about ${previousExplainer.title}. Say 'restart' to hear that again or 'what's new' to hear the latest explainers.`;

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
      this.handler.state = this.attributes.STATE = config.states.START;
      return this.emitWithState('LaunchRequest', 'no_welcome')

    },
    'ListShows' : function () {
      this.handler.state = this.attributes.STATE = config.states.ITERATING_SHOW;
      console.log('list shows from EXPLAINERS');
      this.emitWithState('ListShows');
    },

    'PickItem': function (slot) {
      // set spot in indices
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      var slot = slot || this.event.request.intent.slots;
      feedLoader.call(this, config.testExplainerFeed, false, function(err, feedData) {
        var chosenExplainer = util.itemPicker(slot, feedData.items, 'title', 'topic');
        if (!chosenExplainer) {
          this.attributes.queries.push(slot.query.value);
          console.log("NO EXPLAINER ", slot)
          this.handler.state = config.states.REQUEST;
          this.attributes.STATE = config.states.REQUEST;
          return this.emitWithState('PickItem', slot);
        }
        this.attributes.currentExplainerIndex = chosenExplainer.index;
        util.logExplainer.call(this, chosenExplainer);
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
        this.emit(':saveState', true);
      });

    },
    'PlayLatestExplainer': function () {
      // this is what 'play all would do'
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      this.emitWithState('PickItem', {index: {value: 1}});

    },
    'ReplayExplainer': function () {
      console.log("REPLAY?")
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      console.log('GOT REPLAY', this.handler.state)
      // currentExplainerIndex is 0 based, and PickItem expects 1-based
      this.emitWithState('PickItem', {index: {value: this.attributes.currentExplainerIndex + 1}})
    },
    // STATE TRANSITION:

    'ListExplainers': function () {
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      console.log('list Explainers FROM Playing explainers')
      console.log(JSON.stringify(this.event.request, null, 2));
      this.attributes.currentExplainerIndex = -1;
      this.attributes.indices.explainer = 0;
      this.handler.state = this.attributes.STATE = config.states.ITERATING_EXPLAINER;
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
      if (this.event.request.token === 'PlayLatestExplainer' || this.event.request.token === 'ListExplainers') {
        intentName = this.event.request.token;
      }  else if (this.event.request.token === 'Next' || this.event.request.token === 'Previous') {
        intentName = `AMAZON.${this.event.request.token}Intent`;
      } else {
        var tokenData = this.event.request.token.split('_');
        intentName = tokenData[0];
        intentSlot = {
          index: {
            value: parseInt(tokenData[1]) + 1
          }
        }
      }
      console.log('EXPLAINING, NEXT', intentName, intentSlot);
      this.emitWithState(intentName, intentSlot);
    },

    // BUILT INS:
    'AMAZON.NextIntent' : function () {
      // only in explainer mode, right?
      console.log("NEXT!!!! EXPLAINER", this.handler.state)
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      // handle next at end of list?
      // currentExplainerIndex is 0 based, and PickItem expects 1-based
      this.emitWithState('PickItem', {index: {value: this.attributes.currentExplainerIndex+2}});

      // if we're iterating something, move next

    },
    'AMAZON.PreviousIntent' : function () {
      // only in explainer mode, right?
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);

      // currentExplainerIndex is 0 based, and PickItem expects 1-based
      this.emitWithState('PickItem', {index: {value: this.attributes.currentExplainerIndex}});

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
       console.log('EXPLAINER UNHANDLED',JSON.stringify(this.event, null, 2))
         var message = 'UNHANDLED EXPLAINERS . What now?';
         this.response.speak(message).listen(message);
         this.emit(':responseReady');
     }

  }),
  iteratingExplainerHandlers : Alexa.CreateStateHandler(config.states.ITERATING_EXPLAINER, {
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
    'PickItem': function (slot) {
      console.log('ITERATING EXPLAINER, pick explainer');
      console.log('manual slot', slot);
      console.log('alexa',this.event.request);

      this.handler.state = config.states.PLAYING_EXPLAINER;
      this.attributes.STATE = config.states.PLAYING_EXPLAINER;
      this.emitWithState('PickItem', slot);
    },
    // TOUCH EVENTS
    'ElementSelected': function () {
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);

      // handle play latest or pick episode actions
      console.log('ElementSelected -- ', this.event.request)
      var intentSlot,intentName;
      if (this.event.request.token === 'PlayLatestEpisode' || this.event.request.token === 'ListEpisodes') {
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
      this.emitWithState('ListExplainers');

    },
    'AMAZON.PreviousIntent' : function () {
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
       console.log("UNHANDLED ITERATING EXPLAINER");
         var message = 'UNDHANDLED ITER EXPLAINER What now?';
         this.response.speak(message).listen(message);
         this.emit(':responseReady');
     }


  }),
  iteratingShowHandlers : Alexa.CreateStateHandler(config.states.ITERATING_SHOW, {
    // NOTE: here is where i'm going
    'ListShows': function () { // SHOWS AND ITEMS MIGHT BE EASILY MERGED EVENTUALLY
      console.log("IT SHOW STATE, list", this.event.request);
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      if (this.event.session.new || (!this.attributes.indices.show)) {
        this.attributes.indices.show = 0;
      }
      // This might be better done via the statehandler API

      var data = util.itemLister(
        feeds,
        'Shows',
        'feed',
        this.attributes.indices.show,
        config.items_per_prompt.show
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
    },

    // STATE TRANSITION
    'PickItem': function () {
      console.log('pick item in iterating show')
      this.handler.state = this.attributes.STATE = config.states.ITERATING_EPISODE;
      this.attributes.indices.show = 0;
      this.emitWithState('PickItem');
    },
    // TOUCH
    'ElementSelected': function () {
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);

      // handle play latest or pick episode actions
      console.log('ITERATING SHOW EL SEL --> ', this.event.request)
      var intentSlot,intentName;
      if (this.event.request.token === 'PlayLatestEpisode' || this.event.request.token === 'ListEpisodes') {
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
      this.emitWithState(intentName, intentSlot);
    },

    // BUILT IN
    'AMAZON.NextIntent' : function () {
      console.log("iterating shows NEXT")
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      this.attributes.indices.show += config.items_per_prompt.show;
      this.emitWithState('ListShows');

    },
    'AMAZON.PreviousIntent' : function () {
      console.log('iterating explainers previous')
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      this.attributes.indices.show -= config.items_per_prompt.show;
      // if
      if (this.attributes.indices.show < 0) {
        this.attributes.indices.show = 0;
      }
      this.emitWithState('ListShows');
    },
    // DEFAULT
    'SessionEndedRequest' : function () {
      console.log("IT  SHOW session end")
     },
     'Unhandled' : function () {
       console.log("IT SHOW unhandled", JSON.stringify(this.event.request, null, 2));
         var message = 'UNDHANDLED ITER SHOW What now?';
         this.response.speak(message).listen(message);
         this.emit(':responseReady');
     }


  }),
  iteratingEpisodeHandlers : Alexa.CreateStateHandler(config.states.ITERATING_EPISODE, {
    'PickItem': function(slot) { // this is basically: here's the show, latest or list eps?
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      console.log("ITERATING EP PICK ITEM?", this.event.request)
      // also need out of bounds era on numbers, right?
      // if feeds are being iterated, should destroy that index
      // slots should be specific. show_title rather than title...
      //NOTE: what if we're not currently iterating the shows IE. someone just says "CHOOSE show x"?
      // GOTTA HANDLE FOR THAT
      // NOTE: currently putting show loading behind 1 hour cache... on testing the sendProgressive takes just as long as the damn lookup in most of the cases, so this might not be worth it.
      // NOTE: on the device, progressive comes instantly
      console.log("PICK SHOW SLO", slot);
      var slot = slot || this.event.request.intent.slots;
      var chosen = util.itemPicker(slot, feeds, 'feed', 'feed');

      var showImage = util.cardImage(chosen.image);
      this.attributes.show = chosen.feed;
      this.attributes.indices.show = null;
      this.attributes.indices.episode = 0;

      console.time('pick-show-load');
      feedLoader.call(this, chosen, false, function(err, feedData) {
        console.timeEnd('pick-show-load');
        // this might not be right
        this.response.speak(`You chose ${chosen.feed}. Should I play the latest episode or list the episodes?`)
          .listen("Say 'play latest' to hear the latest episode or 'list episodes' to explore episodes.")
          .cardRenderer(chosen.feed, 'Say "play latest" to hear the latest episode or "list episodes" to explore episodes.', showImage);

        if (this.event.context.System.device.supportedInterfaces.Display) {
          this.response.renderTemplate(
            util.templateBodyTemplate3(
              chosen.feed,
              chosen.image,
              chosen.description,
              "<action value='PlayLatestEpisode'>Play latest</action> | <action value='ListEpisodes'>List episodes</action><br/>",
              config.background.show
            )
          );
        }
        this.response.hint('play the latest episode', 'PlainText')

        console.log('RESPONSE', JSON.stringify(this.response, null, 2));
        this.emit(':responseReady');
      });


    },
    'ListEpisodes': function (slot) {
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);

      // TODO: if we get here directly, NOT having gone through 'Pick Show', we need to do some state management
      var slot = slot || this.event.request.intent.slots;
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
          'episodes',
          'title',
          this.attributes.indices.episode,
          config.items_per_prompt.episode
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
    // TOUCH
    'ElementSelected': function () {
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);

      // handle play latest or pick episode actions
      console.log('ElementSelected -- ', this.event.request)
      var intentSlot,intentName;
      if (this.event.request.token === 'PlayLatestEpisode' || this.event.request.token === 'ListEpisodes') {
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
      console.log('touch',intentName, intentSlot);
      this.emit(intentName, intentSlot);
    },
    // STATE TRANSITIONS
    'PlayLatestEpisode' : function (slot) {
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);

      var slot = slot || this.event.request.intent.slots;

      if (slot && slot.show && slot.show.value) {
        this.attributes.show = slot.show.value;
      }
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
      var show = this.attributes.show
      var chosenShow = util.itemPicker(show, feeds, 'feed', 'feed');
      console.log('Episode pick - pick episode. what our show ', this.attributes.show);
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
    // BUILT IN
    'AMAZON.NextIntent' : function () {
      console.log("iterating Explainers NEXT")
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      this.attributes.indices.episode += config.items_per_prompt.episode;
      this.emitWithState('ListEpisodes');

    },
    'AMAZON.PreviousIntent' : function () {
      console.log('iterating EXPLAINERS previous')
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      this.attributes.indices.episode -= config.items_per_prompt.episode;
      // if
      if (this.attributes.indices.episode < 0) {
        this.attributes.indices.episode = 0;
      }
      this.emitWithState('ListEpisodes');
    },
    // DEFAULT
    'SessionEndedRequest' : function () {
      console.log("ended -- ITERATING  EPS ")
     },
     'Unhandled' : function () {
       console.log("unhandled - ITERATING EP  ");
         var message = 'UNDHANDLED ITERATING EP What now?';
         this.response.speak(message).listen(message);
         this.emit(':responseReady');
     }

  }),
  playingEpisodeHandlers : Alexa.CreateStateHandler(config.states.PLAYING_EPISODE, {
    'PlayLatestEpisode' : function (slot) {
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);

      var slot = slot || this.event.request.intent.slots;

      if (slot && slot.show && slot.show.value) {
        this.attributes.show = slot.show.value;
      }
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
      var show = this.attributes.show
      var chosenShow = util.itemPicker(show, feeds, 'feed', 'feed');
      console.log('Episode pick - PLAYING EP ', this.attributes.show);
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
      // STATE TRANSITIONS

      // TOUCH

    // BUILT IN
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

    // DEFAULT
    'SessionEndedRequest' : function () {
      console.log("IT  PLAYING EP ")
     },
     'Unhandled' : function () {
       console.log("PLAYING EP  unhandled");
         var message = 'UNDHANDLED PLAYING EP What now?';
         this.response.speak(message).listen(message);
         this.emit(':responseReady');
     }

  })

}



module.exports = stateHandlers;
