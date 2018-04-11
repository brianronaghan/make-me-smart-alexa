var Alexa = require('alexa-sdk');

var config = require('../config');
var util = require('../util');
var feeds = config.feeds;

var feedHelper = require('../feedHelpers');
var feedLoader = feedHelper.feedLoader;

var audioPlayer = require('../audioPlayer');

module.exports = Alexa.CreateStateHandler(config.states.ITERATING_EPISODE, {
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
      if (feedData.needsMessage) {
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
    var message = `Let me check for episodes of ${chosen.feed}`;
    feedLoader.call(this, chosen, message, function(err, feedData) {
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
    var links = "<action value='ListEpisodes'>List Episodes</action> | <action value='HomePage'>See New Explainers</action>";

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
  'AMAZON.HelpIntent' : function () {
    console.log('Help in ITERATING EPISODE')
    var message = "You can say 'next' or 'previous', 'list shows' for other shows, or 'what's new' to see our latest explainers.";
    this.response.speak(message).listen(message);
    if (this.event.context.System.device.supportedInterfaces.Display) {
      var links = "<action value='ListShows'>List Shows</action> | <action value='HomePage'>What's New</action>";
      this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Help', message, links, config.background.show));
    }
    this.emit(':saveState', true);
  },
  'SessionEndedRequest' : function () {
    console.log("ended -- ITERATING  EPS -- state ",JSON.stringify(this.event.request, null, 2))
    this.emit(':saveState', true);

   },
   'Unhandled' : function () {
     console.log('unhandled - ITERATING EP ',JSON.stringify(this.event, null, 2))
     this.handler.state = this.attributes.STATE = config.states.START;
     this.emitWithState('LaunchRequest', 'no_welcome', "Sorry I couldn't quite handle that.");
   }

});
