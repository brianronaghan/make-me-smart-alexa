var Alexa = require('alexa-sdk');

var config = require('../config');
var util = require('../util');
var feeds = config.feeds;

var feedHelper = require('../feedHelpers');
var feedLoader = feedHelper.feedLoader;

var audioPlayer = require('../audioPlayer');
var explainers = require('../explainers')

var db = require('../db');

module.exports = Alexa.CreateStateHandler(config.states.ITERATING_EXPLAINER, {
  'ListExplainers': function () {
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    console.log('this.event.req',this.event.request)
    if (this.event.session.new || (!this.attributes.indices.explainer)) { // is this logic correct?
      this.attributes.indices.explainer = 0;
    }
    var data = util.itemLister(
      explainers,
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
          explainers
        )
      );
    }
    this.emit(':responseReady');

  },
  // STATE TRANSITIONS
  'ListShows': function (slot) {
    console.log('list shows from ITERATE explain')
    this.attributes.currentExplainerIndex = -1;
    this.attributes.indices.explainer = 0;
    this.handler.state = this.attributes.STATE = config.states.ITERATING_SHOW;
    this.emitWithState('ListShows');

  },
  'RequestExplainer' : function () {
    console.log('request explainer test')
    this.handler.state = this.attributes.STATE = config.states.REQUEST;
    this.emitWithState('RequestExplainer');
  },
  'PickItem': function (slot) {
    console.log('ITERATING EXPLAINER, pick explainer');
    console.log('manual slot', slot);
    console.log('alexa EVENT',JSON.stringify(this.event.request));
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
  'AMAZON.HelpIntent' : function () {
    console.log('Help in ITERATING EXPLAINER')
    var message = "You can say 'next' or 'previous', or 'what's new' to see our latest explainers.";
    this.response.speak(message).listen(message);
    if (this.event.context.System.device.supportedInterfaces.Display) {
      var links = "<action value='HomePage'>What's New</action>";
      this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Help', message, links, config.background.show));
    }
    this.emit(':saveState', true);
  },
  'SessionEndedRequest' : function () {
    console.log("IT  EXPLAINER  session end", JSON.stringify(this.event.request, null,2));
   },
   'Unhandled' : function () {
     console.log('UNHANDLED ITERATING EXPLAINER',JSON.stringify(this.event, null, 2))
     this.handler.state = this.attributes.STATE = config.states.START;
     this.emitWithState('LaunchRequest', 'no_welcome', "Sorry I couldn't quite handle that.");

   }


})
