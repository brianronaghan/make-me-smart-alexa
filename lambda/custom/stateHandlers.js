'use strict';

var Alexa = require('alexa-sdk');

var config = require('./config');
var util = require('./util');
var feeds = config.feeds;

var feedHelper = require('./feedHelpers');
var feedLoader = feedHelper.feedLoader;

var audioPlayer = require('./audioPlayer')

/*
stateHandlers.startHandlers,
stateHandlers.requestHandlers,
stateHandlers.playingExplainerHandlers,
stateHandlers.iteratingExplainerHandlers,
stateHandlers.iteratingShowHandlers,
stateHandlers.iteratingEpisodeHandlers,
stateHandlers.playingEpisodeHandlers

*/

var stateHandlers = {
  startHandlers : Alexa.CreateStateHandler(config.states.START, {
    // 'NewSession': function () {
    // //   console.log('new session ', JSON.stringify(this.event, null, 2));
    // },
    'LaunchRequest': function (condition, message) {
      console.log('LAUNCH in, START STATE. handler state', this.handler.state, ' atty state', this.attributes.STATE)
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
      } else if (condtion === 'finished_playing') {
        if (message) {
          intro += message;
        }
        intro += 'You might also like our explainers. This week ';
      }
      util.nullCheck.call(this, deviceId);
      // I DON'T THINK I NEED TO RESET:
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
      var boundThis = this;
      console.log("REQUEST PICK ITEM SLOT ", slot)
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
      } else if (!slot.userName.value ) { // NOTE NOT SAVING NAME && !this.attributes.userName
        message += `Hmmm, we don't have anything on ${slot.query.value}. But I'll ask Kai and Molly to look into it. Who should I say is asking?`;
        this.emit(':elicitSlot', 'userName', message, "Let me know what name to leave.");
      } else if (!slot.userLocation.value ) { // NOTE NOT SAVING NAME && this.attributes.userLocation
        this.attributes.userName = slot.userName.value;
        message += 'And where are you from?';
        this.emit(':elicitSlot', 'userLocation', message, "Let me know what location to leave.");
      } else {
        this.attributes.userLocation = slot.userLocation.value;
        this.attributes.requests.push({
          timestamp: Date.now(),
          query: slot.query.value,
          name: slot.userName.value,
          location: slot.userLocation.value
        });
        var confirmationMessage =  `Okay, I'll tell Kai and Molly that ${slot.userName.value} from ${slot.userLocation.value} asked for an explainer about ${slot.query.value}.`;

        // TODO: if was playing, resume, reset state

        if (this.attributes.IN_PROGRESS_EP) {
          delete this.attributes.IN_PROGRESS_EP;
          this.handler.state = this.attributes.STATE = config.states.PLAYING_EPISODE;
          confirmationMessage += ` Now I'll resume ${this.attributes.playing.title}.`;
          audioPlayer.resume.call(this, confirmationMessage);

        } else {
          this.handler.state = this.attributes.STATE = config.states.START;

          return util.sendProgressive(
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

      }
    },
    'LaunchRequest' : function () {
      this.handler.state = this.attributes.STATE = config.states.START;
      this.emitWithState('LaunchRequest');
    },
    'SessionEndedRequest' : function () {
      console.log("SESSION ENDED IN REQUEST")
     },
     'Unhandled' : function () {
       console.log("REQUEST unhandled -> event  ",JSON.stringify(this.event.request,null, 2));
         var message = 'UNDHANDLED REQUEST What now?';
         this.response.speak(message).listen(message);
         this.emit(':responseReady');
     }

  }),
  playingExplainerHandlers : Alexa.CreateStateHandler(config.states.PLAYING_EXPLAINER, {
    'LaunchRequest': function () {
      var deviceId = util.getDeviceId.call(this);
      var intro = `Welcome back to Make Me Smart. `;
      util.nullCheck.call(this, deviceId);

      console.log('LAUNCH IN EXPLAINER STATE');
      // console.log('handler state', this.handler.state, ' atty state', this.attributes.STATE)
      if (!this.attributes.currentExplainerIndex || this.attributes.currentExplainerIndex === -1) {
        console.log('no explainer index SWITCHING state');
        this.handler.state = this.attributes.STATE = config.states.START;
        return this.emitWithState('LaunchRequest')
      }
      var boundThis = this;
      feedLoader.call(this, config.testExplainerFeed, false, function(err, feedData) {
        var previousExplainer = feedData.items[this.attributes.currentExplainerIndex];

        intro += `Last time you were learning about ${previousExplainer.title}. Say 'restart' to hear that again or 'what's new' to hear the latest explainers.`;


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
      // why did what's new not go here?
      this.attributes.currentExplainerIndex = -1;
      this.handler.state = this.attributes.STATE = config.states.START;
      return this.emitWithState('LaunchRequest', 'no_welcome')
    },

    'PickItem': function (slot) {
      // set spot in indices
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      var slot = slot || this.event.request.intent.slots;
      feedLoader.call(this, config.testExplainerFeed, false, function(err, feedData) {
        var chosenExplainer = util.itemPicker(slot, feedData.items, 'title', 'topic');
        if (!chosenExplainer && slot.query) {
          // if query, it's a req
          // else, it's a ... what? just go home
          console.log("NO EXPLAINER , but there is query ", slot)
          this.handler.state = config.states.REQUEST;
          this.attributes.STATE = config.states.REQUEST;
          return this.emitWithState('PickItem', slot);
        }
        this.attributes.currentExplainerIndex = chosenExplainer.index;
        util.logExplainer.call(this, chosenExplainer);
        var intro = `Here's ${chosenExplainer.author} explaining ${chosenExplainer.title}. <audio src="${chosenExplainer.audio.url}" /> `;
        var prompt;
        var links = "<action value='ReplayExplainer'>Replay</action> | <action value='ListExplainers'>List explainers</action>";
        if (feedData.items[chosenExplainer.index+1]) { // handle if end of explainer feed
          prompt = `Say 'replay' to hear that again, 'next' to learn about ${feedData.items[chosenExplainer.index+1].title}, or 'list explainers' to see all of our explainers.`;
          links += " | <action value='Next'>Next</action>";
        } else {
          prompt = "And that's all we have right now. Say 'replay' to hear that again, 'list explainers' to see all, or 'play full episodes' for full episodes of our shows."
          links += " | <action value='ListShows'>Play full episodes</action>";
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
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      console.log('GOT REPLAY', this.handler.state)
      // currentExplainerIndex is 0 based, and PickItem expects 1-based
      this.emitWithState('PickItem', {index: {value: this.attributes.currentExplainerIndex + 1}})
    },
    // STATE TRANSITION:
    'ListShows' : function () {
      console.log('list shows from play explain')
      this.attributes.currentExplainerIndex = -1;
      this.attributes.indices.explainer = 0;
      this.handler.state = this.attributes.STATE = config.states.ITERATING_SHOW;
      this.emitWithState('ListShows');
    },

    'ListExplainers': function () {
      console.log('list explainers from play explain')

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
    'ListEpisodes' : function () {
      this.attributes.currentExplainerIndex = -1;
      this.attributes.indices.explainer = 0;
      this.handler.state = this.attributes.STATE = config.states.ITERATING_EPISODE;
      console.log('LIST EPISODES from PLAY EXP')
      this.emitWithState('ListEpisodes');
    },

    // TOUCH EVENTS:
    'ElementSelected': function () {
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);

      // handle play latest or pick episode actions
      console.log('ElementSelected -- ', this.event.request)
      var intentSlot,intentName;
      if (this.event.request.token === 'PlayLatestExplainer' || this.event.request.token === 'ListExplainers' || this.event.request.token === 'ListShows') {
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
      console.log('PLAYING EXPLAINERS, TOUCH', intentName, intentSlot);
      this.emitWithState(intentName, intentSlot);
    },

    // BUILT INS:
    'AMAZON.NextIntent' : function () {
      // only in explainer mode, right?
      console.log("NEXT!!!! EXPLAINER", this.handler.state)
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      // handle next at end of list?
      feedLoader.call(this, config.testExplainerFeed, false, function(err, feedData) {
        if (feedData.items.length <= this.attributes.currentExplainerIndex +1) {
          // last spot
          var message = "We don't have any more explainers right now. Say 'list explainers' to see all or 'play full episodes' to hear episodes of our shows."
          var prompt = "Say 'list explainers' to see all, or 'play full episodes' to for full episodes of our show."
          var links = "<action value='ListExplainers'>List explainers</action> | <action value='ListShows'>Play full episodes</action>";

          if (this.event.context.System.device.supportedInterfaces.Display) {
            this.response.renderTemplate(
              util.templateBodyTemplate3(
                "Make Me Smart",
                config.icon.full,
                "We don't have any more explainers right now.",
                links,
                config.background.show
              )
            );
          }
          this.response.speak(message).listen(prompt);
          this.emit(':saveState');

        } else {
          // currentExplainerIndex is 0 based, and PickItem expects 1-based
          return this.emitWithState('PickItem', {index: {value: this.attributes.currentExplainerIndex+2}});

        }
      })
    },
    'AMAZON.PreviousIntent' : function () {
      // only in playing explainer mode, right?
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      // currentExplainerIndex is 0-indexed, and PickItem expects 1-indexed (b/c user input)
      this.emitWithState('PickItem', {index: {value: this.attributes.currentExplainerIndex}});


    },
    'AMAZON.StopIntent' : function() {
      console.log('STOP EXPLAINER STATE')
      // This needs to work for not playing as well
      this.response.speak('See you later. Say alexa, make me smart to get learning again.')
      this.emit(':saveState');
    },
    'AMAZON.CancelIntent' : function() {
      console.log('STOP EXPLAINER STATE')
      // This needs to work for not playing as well
      this.response.speak('See you later. Say alexa, make me smart to get learning again.')
      this.emit(':saveState');
    },
    'AMAZON.ResumeIntent' : function() {
      console.log('RESume playing EXPLAINER STATE')
      // This needs to work for not playing as well
      this.emitWithState('LaunchRequest');
    },

    'AMAZON.PauseIntent' : function() {
      console.log('STOP EXPLAINER STATE')
      // This needs to work for not playing as well
      this.response.speak('See you later. Say alexa, make me smart to get learning again.')
      this.emit(':saveState');
    },

    // DEFAULT:
    'SessionEndedRequest' : function () {
      console.log("PLAYING EXPLAINER session end", JSON.stringify(this.event.request, null,2));

     },
     'Unhandled' : function () {
       console.log('PLAYING EXPLAINER UNHANDLED',JSON.stringify(this.event, null, 2))
       if (this.event.context.AudioPlayer) {
         console.log('we screwed, audio in mismatched state')
       }
       var message = 'UNHANDLED PLAYING EXPLAINERS . What now?';
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
    'ListShows': function (slot) {
      console.log('list shows from ITERATE explain')
      this.attributes.currentExplainerIndex = -1;
      this.attributes.indices.explainer = 0;
      this.handler.state = this.attributes.STATE = config.states.ITERATING_SHOW;
      this.emitWithState('ListShows');

    },

    'PickItem': function (slot) {
      console.log('ITERATING EXPLAINER, pick explainer');
      console.log('manual slot', slot);
      console.log('alexa',this.event.request);

      this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
      this.emitWithState('PickItem', slot);
    },

    //
    'LaunchRequest': function () {
      this.handler.state = this.attributes.STATE = config.states.START;
      this.emitWithState('LaunchRequest');
    },
    // TOUCH EVENTS
    'ElementSelected': function () {
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);

      // handle play latest or pick episode actions
      console.log('ElementSelected -- ', this.event.request)
      var intentSlot,intentName;
      if (this.event.request.token === 'PlayLatestEpisode' || this.event.request.token === 'ListEpisodes') { // I don't think I use either
        intentName = this.event.request.token;
        intentSlot = {
          index: {
            value: this.attributes.show
          }
        }
      }  else if (this.event.request.token.indexOf('_') > -1) {
        var tokenData = this.event.request.token.split('_');
        intentName = tokenData[0];
        intentSlot = {
          index: {
            value: parseInt(tokenData[1]) + 1
          }
        }
      }
      console.log('IT EXPLAIN TOUCH', intentName, intentSlot);
      this.emitWithState(intentName, intentSlot);
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
      console.log("IT  EXPLAINER  session end", JSON.stringify(this.event.request, null,2));
     },
     'Unhandled' : function () {
       console.log("UNHANDLED ITERATING EXPLAINER", this.event.request);
         var message = 'UNDHANDLED ITER EXPLAINER What now?';
         this.response.speak(message).listen(message);
         this.emit(':responseReady');
     }


  }),
  iteratingShowHandlers : Alexa.CreateStateHandler(config.states.ITERATING_SHOW, {
    'ListShows': function () { // SHOWS AND ITEMS MIGHT BE EASILY MERGED EVENTUALLY
      console.log("IT SHOW STATE, list", this.event.request);
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      if (this.event.session.new || (!this.attributes.indices.show)) {
        this.attributes.indices.show = 0;
      }

      var data = util.itemLister(
        feeds,
        'Shows',
        'feed',
        this.attributes.indices.show,
        config.items_per_prompt.show
      );
      // console.log("SHOW LIST ", data)
      this.response.speak(data.itemsAudio).listen('Pick one or say next or previous to move forward or backward through list.').cardRenderer(data.itemsCard);
      console.log('DEV DISP', JSON.stringify(this.event.context.System.device.supportedInterfaces.Display, null,2));

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
    'LaunchRequest': function () { // iterating shows
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      this.attributes.indices.show = 0;
      this.attributes.indices.episode = 0;
      this.attributes.show = null;
      this.handler.state = this.attributes.STATE = config.states.START;
      this.emitWithState('LaunchRequest');
      // go back to home page
    },
    // STATE TRANSITION
    'PickItem': function (slot) {
      console.log('pick item in iterating show', this.attributes.STATE)
      // this should do the display of show, and choice of latest or list
      // THE INTENTS for play latest and list episodes transition to the next state

      var slot = slot || this.event.request.intent.slots;
      var chosen = util.itemPicker(slot, feeds, 'feed', 'feed');

      var showImage = util.cardImage(chosen.image);
      this.attributes.show = chosen.feed;
      this.attributes.indices.show = 0;
      this.attributes.indices.episode = 0;
      console.log("SHOUD BE 0",
        this.attributes.indices.show,
        this.attributes.indices.episode
      )
      console.time('pick-show-load');
      var intro = `You chose ${chosen.feed}. `
      feedLoader.call(this, chosen, intro, function(err, feedData) {
        console.timeEnd('pick-show-load');
        // this might not be right
        this.response.speak(`${feedData.cached ? intro : ''} Should I play the latest episode or list the episodes?`)
          .listen("Say 'play latest' to hear the latest episode or 'list episodes' to explore episodes.")
          .cardRenderer(chosen.feed, "Say 'play latest' to hear the latest episode or 'list episodes' to explore episodes.", showImage);

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
        console.log('RESPONSE', JSON.stringify(this.response, null, 2));
        this.emit(':responseReady');
       });
    },
    'PlayLatestEpisode': function () {
      this.handler.state = this.attributes.STATE = config.states.PLAYING_EPISODE;
      console.log("ITERATING SHOW, PLAY LATEST ", this.attributes.show)
      this.emitWithState('PlayLatestEpisode', {show: {value: this.attributes.show}});
    },
    'ListEpisodes': function () {
      console.log("ITERATING SHOW, LIST EPISODES ", this.attributes.show)

      this.handler.state = this.attributes.STATE = config.states.ITERATING_EPISODE;
      this.emitWithState('ListEpisodes', {show: {value: this.attributes.show}});

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
      }  else if (this.event.request.token.indexOf('_') > -1) {
        var tokenData = this.event.request.token.split('_');
        intentName = tokenData[0];
        intentSlot = {
          index: {
            value: parseInt(tokenData[1]) + 1
          }
        }
      } else {
        intentName = this.event.request.token;
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
      console.log('iterating shows previous')
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
      console.log("IT  SHOW session end", JSON.stringify(this.event.request, null,2));
     },
     'Unhandled' : function () {
       console.log("IT SHOW unhandled", JSON.stringify(this.event.request, null, 2));
         var message = 'UNDHANDLED ITER SHOW What now?';
         this.response.speak(message).listen(message);
         this.emit(':responseReady');
     }


  }),
  iteratingEpisodeHandlers : Alexa.CreateStateHandler(config.states.ITERATING_EPISODE, {
    'PickItem': function (slot) {
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);

      var slot = slot || this.event.request.intent.slots;
      var show = this.attributes.show;
      this.handler.state = this.attributes.STATE = config.states.PLAYING_EPISODE;
      var chosenShow = util.itemPicker(show, feeds, 'feed', 'feed');
      var message = `Let me grab the episode`;
      feedLoader.call(this, chosenShow, message, function(err, feedData) {
        console.log('PICK EPISODE feed load cb')
        var chosenEp = util.itemPicker(slot, feedData.items, 'title', 'title');
        console.log('PICK EPISODE', JSON.stringify(chosenEp, null, 2));
        if (feedData.cached) {
          this.response.speak(`Starting ${chosenEp.title}`);
        }
        audioPlayer.start.call(this, chosenEp, 'episode', chosenShow.feed);
      });
    },

    'ListEpisodes': function (slot) {
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      console.log("IT EP IN IT EP ", this.attributes.indices.episode, " SHOW ", this.attributes.show, 'SLOT ', slot);
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
      var message = `Let me check for episodes of ${chosen.feed}`;
      feedLoader.call(this, chosen, message, function(err, feedData) {
        console.timeEnd('list-episodes-load');
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
      console.log('ITERATING EP touch',intentName, intentSlot);
      this.emitWithState(intentName, intentSlot);
    },
    // STATE TRANSITIONS
    'LaunchRequest': function () {
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);

      var intro = `Welcome back to Make Me Smart. Last time you were exploring episodes of ${this.attributes.show}. Say 'list episodes' to see all episodes or 'what's new' to hear the latest explainers.`;
      this.attributes.indices.show = 0;
      this.attributes.indices.episode = 0;
      this.response.speak(intro).listen("Say 'list episodes' or 'what's new' to explore explainers.");
      var links = "<action value='ListEpisodes'>List Episodes</action> | <action value='HomePage'>List Explainers</action>";

      if (this.event.context.System.device.supportedInterfaces.Display) {
        this.response.renderTemplate(util.templateBodyTemplate1('Welcome Back to Make Me Smart', intro, links, config.background.show));
      }
      this.emit(':saveState', true);

    },

    'HomePage': function () {
      this.attributes.currentExplainerIndex = 0;
      this.handler.state = this.attributes.STATE = config.states.START;
      return this.emitWithState('LaunchRequest', 'no_welcome')
    },
    'ListShows': function () {
      this.attributes.show = null;
      this.attributes.indices.episode = 0;
      this.attributes.indices.show = 0;
      this.handler.state = this.attributes.STATE = config.states.ITERATING_SHOW;
      this.emitWithState('ListShows');
    },

    'PlayLatestEpisode' : function (slot) {
      // var deviceId = util.getDeviceId.call(this);
      // util.nullCheck.call(this, deviceId);
      //
      // var slot = slot || this.event.request.intent.slots;
      //
      // if (slot && slot.show && slot.show.value) {
      //   this.attributes.show = slot.show.value;
      // }
      // var show = this.attributes.show || 'Make Me Smart';
      // var chosenShow = util.itemPicker(show, feeds, 'feed', 'feed');
      // var showImage = util.cardImage(chosenShow.image);
      console.log('PLAY THE LATEST from iterating eps -> show   ', this.attributes.show)
      this.handler.state = this.attributes.STATE = config.states.PLAYING_EPISODE;
      this.emitWithState('PlayLatestEpisode', slot)
      // var message = `Let me find the latest episode of ${chosenShow.feed}`;
      // feedLoader.call(this, chosenShow, message, function(err, feedData) {
      //   console.log('PLAY LATEST ')
      //   var chosenEp = feedData.items[0];
      //   this.response.speak(`Playing the latest ${chosenShow.feed}, titled ${chosenEp.title}`);
      //   audioPlayer.start.call(this, chosenEp, 'episode', chosenShow.feed);
      // });
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
      console.log("ended -- ITERATING  EPS -- state ",JSON.stringify(this.event.request, null, 2))
      this.emit(':saveState', true);

     },
     'Unhandled' : function () {
       console.log("unhandled - ITERATING EP  ", this.event.request);
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
      console.log("PLAYING EPISODE, PLAY LATEST", slot)
      if (slot && slot.show && slot.show.value) {
        this.attributes.show = slot.show.value;
      }
      var show = this.attributes.show || 'Make Me Smart';
      var chosenShow = util.itemPicker(show, feeds, 'feed', 'feed');
      var showImage = util.cardImage(chosenShow.image);
      var message = `Let me find the latest episode of ${chosenShow.feed}`;

      feedLoader.call(this, chosenShow, message, function(err, feedData) {
        console.log('PLAY LATEST feed load cb')
        var chosenEp = feedData.items[0];
        this.response.speak(`Playing the latest ${chosenShow.feed}, titled ${chosenEp.title}`);
        audioPlayer.start.call(this, chosenEp, 'episode', chosenShow.feed);
      });
    },
    // STATE TRANSITIONS
    'ListShows' : function () {
      this.handler.state = this.attributes.STATE = config.states.ITERATING_SHOW;
      this.emitWithState('ListShows');
    },
    'HomePage' : function () {
      this.handler.state = this.attributes.STATE = config.states.START;
      this.emitWithState('LaunchRequest', 'no_welcome');
    },
    'LaunchRequest' : function () {
      console.log('LAUNCH REQUEST from playing ep', this.attributes.playing)
      // this.emitWithState('LaunchRequest', 'no_welcome');
      var intro = `Welcome back to Make Me Smart. Last time you were listening to a ${this.attributes.playing.feed} episode titled ${this.attributes.playing.title}. Say 'resume' to continue or 'what's new' to hear our latest explainers.`;
      var links = "<action value='Resume'>Resume Episode</action> | <action value='HomePage'>See New Explainers</action>";

      if (this.event.context.System.device.supportedInterfaces.Display) {
        this.response.renderTemplate(util.templateBodyTemplate1('Welcome back to Make Me Smart', intro, links, config.background.show));
      }
      this.response.speak(intro).listen("Say 'resume', or 'what's new' to see what we're getting smart about lately.");

      this.emit(':saveState', true);
    },
    'PickItem' : function () {  // pick item in playing
      var slot = this.event.request.intent.slots;
      console.log("PICK ITEM IN PLAYING EP ", slot);
      if (slot.query && slot.query.value) {
        if (this.attributes.playing.status === 'playing' || this.attributes.playing.status === 'stopped') {
          this.handler.state = this.attributes.STATE = config.states.REQUEST;

          audioPlayer.stop.call(this, function () {
            console.log("AND NOW PICKING ITEM;");
            this.attributes.IN_PROGRESS_EP = true;
            this.emitWithState('PickItem', slot);
          });
        } else {
          this.handler.state = this.attributes.STATE = config.states.REQUEST;
          console.log('HAD PREVIOUSLY PAUSED')
          this.emitWithState('PickItem', slot);
        }

      } else {
        console.log('IN PLAYING EP, PICK ITEM, no query', slot)
      }

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
      } else if (this.event.request.token === 'Next' || this.event.request.token === 'Previous' || this.event.request.token === 'Resume') {
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
      console.log('PLAYING EP touch',intentName, intentSlot);
      this.emitWithState(intentName, intentSlot);
    },

    // BUILT IN
    'AMAZON.ResumeIntent' : function () {
      console.log('buit in RESUME');
      audioPlayer.resume.call(this);
    },

    'AMAZON.StopIntent' : function() {
      console.log('built in STOP')
      // This needs to work for not playing as well
      audioPlayer.stop.call(this);
    },
    'AMAZON.CancelIntent' : function() {
      console.log('built in STOP')
      // This needs to work for not playing as well
      audioPlayer.stop.call(this);
    },

    'AMAZON.PauseIntent' : function () {
        this.response.speak(`Stopping. Say resume to continue episode ${this.attributes.playing.title}`);
        audioPlayer.stop.call(this);
    },
    'AMAZON.NextIntent' : function () {
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      console.log('NEXT called, PLAYING ->', this.attributes.playing)
      // if we're iterating something, move next
      if (this.attributes.playing) {
        console.log('we are playing', this.attributes.playing.type)
        var chosenShow;
        if (this.attributes.playing.type === 'episode') {
          chosenShow = util.itemPicker(this.attributes.playing.feed, feeds, 'feed', 'feed');
        }
        var boundThis = this;
        feedLoader.call(boundThis, chosenShow, false, function(err, feedData) {
          var nextEp = util.nextPicker(boundThis.attributes.playing, 'token', feedData.items, 'guid');
          if (nextEp === -1) {
            console.log('handle no next')
            this.handler.state = this.attributes.STATE = config.states.START;
            var message = `You've gotten to end of ${feedData.feed}. `;
            // what happens? Should I give a message along the lines of: that's the end?
            util.sendProgressive(
              boundThis.event.context.System.apiEndpoint, // no need to add directives params
              boundThis.event.request.requestId,
              boundThis.event.context.System.apiAccessToken,
              message,
              function (err) {
                console.log('progressive cb',err)
                if (err) {
                  return boundThis.emitWithState('LaunchRequest', 'finished_playing', message);
                } else {
                  return boundThis.emitWithState('LaunchRequest', 'finished_playing');
                }
              }
            );
          } else {
            var nextSpeech = 'Okay. '
            switch(this.attributes.playing.status) {
              case 'playing':
                nextSpeech += `Skipping to the next ${boundThis.attributes.playing.feed}, titled ${nextEp.title}.`;
                break;
              case 'finished':
                nextSpeech += `Last time you finished hearing ${boundThis.attributes.playing.title}. I'll play the next ${boundThis.attributes.playing.type}.`;
                break;
              default:
                nextSpeech += `Playing the next ${boundThis.attributes.playing.feed}, titled ${nextEp.title}.`;
                break;
            }
            this.response.speak(nextSpeech);
            audioPlayer.start.call(this, nextEp, boundThis.attributes.playing.type, chosenShow.feed);
          }
        });
      } else {
        this.handler.state = this.attributes.STATE = config.states.START;
        this.emitWithState('LaunchRequest');
      }
    },
    'AMAZON.PreviousIntent' : function () {
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      var chosenShow;
      if (this.attributes.playing && this.attributes.playing.type === 'episode') {

        chosenShow = util.itemPicker(this.attributes.playing.feed, feeds, 'feed', 'feed');
        var boundThis = this;
        feedLoader.call(boundThis, chosenShow, false, function(err, feedData) {
          var prevEp = util.prevPicker(boundThis.attributes.playing, 'token', feedData.items, 'guid');
          if (prevEp === -1) {
            console.log("FUCK PREVIOUS", this.attributes.playing);
            var message = `There is no newer episode of ${chosenShow.feed}. `;
            if (this.attributes.playing.status === 'playing' || this.attributes.playing.status === 'stopped') {
              message += `Say 'resume' to continue the episode titled ${this.attributes.playing.title}, or say 'what's new' to explore our latest explainers.`;
              if (this.event.context.System.device.supportedInterfaces.Display) {
                this.response.renderTemplate(util.templateBodyTemplate1(this.attributes.playing.title, message, '', config.background.show));
              }
              audioPlayer.stop.call(this, function () {
                this.response.speak(message).listen("Say 'resume' or 'what's new.'");
                this.emit(':responseReady');
              }); // TODO: make it actually stop

            } else {
              return util.sendProgressive(
                boundThis.event.context.System.apiEndpoint, // no need to add directives params
                boundThis.event.request.requestId,
                boundThis.event.context.System.apiAccessToken,
                message,
                function (err) {
                  console.log('progressive cb',err)
                  if (err) {
                    return boundThis.emitWithState('LaunchRequest', 'finished_playing', message);
                  } else {
                    return boundThis.emitWithState('LaunchRequest', 'finished_playing');
                  }
                }
              );
            }
          } else {
            var prevSpeech = 'Okay. '
            switch(this.attributes.playing.status) {
              case 'playing':
                prevSpeech += `Playing the previous ${boundThis.attributes.playing.feed}, titled ${prevEp.title}.`;
                break;
              case 'finished':
                prevSpeech += `Last time you finished hearing ${boundThis.attributes.playing.title}. I'll play the previous ${boundThis.attributes.playing.type}.`;
                break;
              default:
                prevSpeech += `Playing the previous ${boundThis.attributes.playing.feed}, titled ${prevEp.title}.`;
                break;
            }
            this.response.speak(prevSpeech);
            audioPlayer.start.call(this, prevEp, boundThis.attributes.playing.type, chosenShow.feed);
          }
        });
      } else {
        this.handler.state = this.attributes.STATE = config.states.START;
        this.emitWithState('LaunchRequest');
      }
    },



    // DEFAULT
    'SessionEndedRequest' : function () {
      console.log("SESSION ENDED  PLAYING EP ")
     },
     'Unhandled' : function () {
       console.log("PLAYING EP  unhandled", JSON.stringify(this.event.request, null,2));
         var message = 'UNDHANDLED PLAYING EP What now?';
         this.response.speak(message);
         this.emit(':responseReady');
     }

  })

}



module.exports = stateHandlers;
