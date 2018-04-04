var Alexa = require('alexa-sdk');

var config = require('../config');
var util = require('../util');
var feeds = config.feeds;

var feedHelper = require('../feedHelpers');
var feedLoader = feedHelper.feedLoader;

var audioPlayer = require('../audioPlayer');

module.exports = Alexa.CreateStateHandler(config.states.ITERATING_SHOW, {
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
    var boundThis = this;
    if (!chosen) {
      var message = "I couldn't make that out. "
      // progressive...
      return util.sendProgressive(
        boundThis.event.context.System.apiEndpoint, // no need to add directives params
        boundThis.event.request.requestId,
        boundThis.event.context.System.apiAccessToken,
        message,
        function (err) {
          console.log("ERR PROGR", err)
          return boundThis.emitWithState('ListShows');
        }
      );
    }
    var showImage = util.cardImage(chosen.image);
    this.attributes.show = chosen.feed;
    this.attributes.indices.show = 0;
    this.attributes.indices.episode = 0;
    console.time('pick-show-load');
    var intro = `You chose ${chosen.feed}. `
    feedLoader.call(this, chosen, intro, function(err, feedData) {
      console.timeEnd('pick-show-load');
      // this might not be right
      console.log('CACHED?' , feedData.needsMessage)
      this.response.speak(`${feedData.needsMessage ? intro : ''} Should I play the latest episode or list the episodes?`)
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

  'HomePage': function () {
    this.attributes.currentExplainerIndex = 0;
    this.attributes.show = null;
    this.handler.state = this.attributes.STATE = config.states.START;
    return this.emitWithState('LaunchRequest', 'no_welcome')
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
  'AMAZON.CancelIntent' : function() {
    console.log('built in CANCEL');
  },
  'AMAZON.StopIntent' : function() {
    console.log('STOP ITERATING SHOW')
    // This needs to work for not playing as well
    this.response.speak('See you later. Say alexa, Make Me Smart to get learning again.')
    this.emit(':saveState');
  },

  // DEFAULT
  'AMAZON.HelpIntent' : function () {
    console.log('Help in ITERATING SHOW')
    var message = "You can say 'next' or 'previous', 'list shows', or 'what's new' to see our latest explainers.";
    this.response.speak(message).listen(message);
    if (this.event.context.System.device.supportedInterfaces.Display) {
      var links = "<action value='ListShows'>List Shows</action> | <action value='HomePage'>What's New</action>";
      this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Help', message, links, config.background.show));
    }
    this.emit(':saveState', true);
  },
  'SessionEndedRequest' : function () {
    console.log("IT  SHOW session end", JSON.stringify(this.event.request, null,2));
   },
   'Unhandled' : function () {
     console.log('UNHANDLED ITERATING SHOW',JSON.stringify(this.event, null, 2))
     this.handler.state = this.attributes.STATE = config.states.START;
     this.emitWithState('LaunchRequest', 'no_welcome', "Sorry I couldn't quite handle that.");
   }
});
