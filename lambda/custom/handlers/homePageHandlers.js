'use strict';

var Alexa = require('alexa-sdk');

var config = require('../config');
var util = require('../util');

var explainers = require('../explainers');

var dynasty = require('dynasty')({ region: process.env.AWS_DEFAULT_REGION });
var sessions = dynasty.table(config.sessionDBName);

var db = require('../db');

module.exports = Alexa.CreateStateHandler(config.states.HOME_PAGE, {
  'LaunchRequest': function () {
    console.log("PLAYING LAUNCH REQ", this.handler.state)
    this.handler.state = this.attributes.STATE = config.states.START;
    this.emitWithState('LaunchRequest');
  },
  'HomePage': function (condition, message) {
    // why did what's new not go here?
    console.log("HOME PAGE EVENT", JSON.stringify(this.event.request, null,2))
    var slot = slot || this.event.request.intent.slots;
    console.log("HOME PAGE CONDITION ", condition)
    if (slot && slot.topic && slot.topic.value && !condition) {
      console.log("GOT topic home", slot)
      return this.emitWithState('PickItem', slot)
    } else if (slot && slot.query && slot.query.value && !condition) {
      console.log("GOT QUERY ELICIT on home", slot)
      // check for stop
      return this.emitWithState('PickItem', slot)
    }

    this.attributes.currentExplainerIndex = -1;
    var intro = '';
    if (condition === 'requested') {
      if (message) {
        intro += `${message} `;
      }
      intro += "In the meantime, we're ";
    } else if (condition === 'no_welcome') {
      if (message) {
        intro += `${message} `;
      }
      intro += "This week we're ";
    } else if (condition === 'from_launch') {
      intro += "We've also been ";
      this.attributes.HEARD_FIRST = 1;
    } else if (this.event.session.new){
      intro += "Welcome back to Make Me Smart. This week we're ";
    } else {
      intro += "This week we're "
    }
    var topics = explainers.map(function(item) {
      return item.title
    });
    intro += `learning about <prosody pitch="high" volume="x-loud">1) ${topics[this.attributes.HEARD_FIRST + 0]}</prosody>, <prosody volume="x-loud" pitch="high">2) ${topics[this.attributes.HEARD_FIRST + 1]}</prosody>, and <prosody volume="x-loud" pitch="high">3) ${topics[this.attributes.HEARD_FIRST + 2]}</prosody>. You can pick one or say 'play all.' Which would you like to hear?`;

    let newIntent = this.event.request.intent;
    console.log('INTENT', this.event.request.intent)

    // this.response.speak(intro).listen("Which topic would you like to get smart about?");
    /*
    ':elicitSlotWithCard': function (slotName, speechOutput, repromptSpeech, cardTitle, cardContent, updatedIntent, imageObj) {
    */
    this.emit(':elicitSlotWithCard', 'query', intro, "Which would you like to hear?", 'Latest Explainers', util.clearProsody(intro), this.event.request.intent, util.cardImage(config.icon.full) );

  },

  'PickItem': function (slot, source) {
    console.log("PICK IN HOME PAGE", this.event.request.intent.slots)
    // set spot in indices
    var slot = slot || this.event.request.intent.slots;
    this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
    if (this.attributes.HEARD_FIRST === 1 && slot.index && slot.index.value) {
      slot = {index: {value: parseInt(slot.index.value) + 1}};
      this.attributes.HEARD_FIRST = 0;
      return this.emitWithState('PickItem', slot, 'HOME_AFTER_LAUNCH')
    } else if (this.attributes.HEARD_FIRST === 1 && slot.ordinal && slot.ordinal.value) {
      let index;
      let str = intentSlot.ordinal.value;
      if (str === "second" || str === "second 1") {
          index = 3;
      } else {
        str = str.substring(0, str.length - 2);
      }
      index = parseInt(str);
      slot = {index: {value: index + 1}};
      this.attributes.HEARD_FIRST = 0;
      return this.emitWithState('PickItem', slot, 'HOME_AFTER_LAUNCH')
    } else if (this.attributes.HEARD_FIRST === 1){
      this.attributes.HEARD_FIRST = 0;
      return this.emitWithState('PickItem', slot, 'HOME_AFTER_LAUNCH')
    } else { // need a separate case to retain launch
      return this.emitWithState('PickItem', slot, 'HOME_PAGE')
    }
  },

  'RequestExplainer' : function () {
    console.log('request explainer in HOME PAGE - it is most likely from REQUESTING artifcat')
    var slot = slot || this.event.request.intent.slots;
    if (slot && slot.query && slot.query.value) { // since we can't change the goddamn thing if it uses elicit, if it has a query, probably after being elicited
      return this.emitWithState('PickItem', slot)
    } else {
      this.handler.state = this.attributes.STATE = config.states.REQUEST;
      return this.emitWithState('RequestExplainer', {query: {value:null},userLocation: {value: null}, userName: {value: null}});
    }
  },


  'PlayLatestExplainer': function () {
    // this is what 'play all would do'
    this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
    if (this.attributes.HEARD_FIRST === 1) {
      this.attributes.HEARD_FIRST = 0;
      this.emitWithState('PickItem', {index: {value: 2}}, 'HOMEPAGE_LATEST_AFTER_LAUNCH');
    } else {
      this.emitWithState('PickItem', {index: {value: 1}}, 'HOMEPAGE_LATEST');

    }
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
    } else if (this.event.request.token === 'RequestExplainer') {
      intentName = this.event.request.token;
      intentSlot = {query: {value:null},userLocation: {value: null}, userName: {value: null}};
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
    this.emitWithState(intentName, intentSlot, 'TOUCH_HOMEPAGE');
  },

  'AMAZON.NextIntent': function () {
    // what should next even do here?
    this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
    this.emitWithState('PickItem', {index: {value: 1}}, 'HOMEPAGE_NEXT');
  },
  'ChangeMyInfo' : function () {
    this.handler.state = this.attributes.STATE = config.states.REQUEST;
    this.emitWithState('ChangeMyInfo');
  },
  'ListExplainers': function () {
    console.log('list explainers from HOME PAGE')

    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    this.attributes.HEARD_FIRST = 0;

    console.log('list Explainers FROM HOME PAGE')

    console.log(JSON.stringify(this.event.request, null, 2));
    this.attributes.currentExplainerIndex = -1;
    this.attributes.indices.explainer = 0;
    this.attributes.HEARD_FIRST = 0;
    this.handler.state = this.attributes.STATE = config.states.ITERATING_EXPLAINER;
    // this just throws to the correct state version of itself
    this.emitWithState('ListExplainers');
  },


  // DEFAULT:
  // 'AMAZON.FallbackIntent': function () {
  //   console.log("UM WHAT FALL BACK", JSON.stringify(this, null,2))
  //   var message = "FALL BACK. You can pick a topic or choose by number or say 'play all'.";
  //   this.response.speak(message).listen(message);
  //   if (this.event.context.System.device.supportedInterfaces.Display) {
  //     var links = "<action value='HomePage'>What's New</action> | <action value='ListExplainers'>List Explainers</action>";
  //     this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Help', message, links, config.background.show));
  //   }
  //   this.emit(':saveState', true);
  //
  // },

  'AMAZON.CancelIntent' : function() {
    console.log('CANCEL HOME PAGE')
    // This needs to work for not playing as well
    delete this.attributes.STATE;

    this.response.speak("See you later. Say 'Alexa, Make Me Smart' to get learning again.");
    this.emit(':saveState');
  },
  'AMAZON.StopIntent' : function() {
    console.log('STOP HOME PAGE STATE')
    // This needs to work for not playing as well
    // SHOULD I CLEAR THE STATE?
    delete this.attributes.STATE;
    this.response.speak('See you later. Say alexa, Make Me Smart to get learning again.')
    this.emit(':saveState');
  },

  'AMAZON.HelpIntent' : function () {
    console.log('Help in HOME PAGE')
    var message = "Try using the numbers before the topics if you're having trouble. You can pick a topic or choose by number or say 'play all'.";
    this.response.speak(message).listen(message);
    if (this.event.context.System.device.supportedInterfaces.Display) {
      var links = "<action value='HomePage'>What's New</action> | <action value='ListExplainers'>List Explainers</action>";
      this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Help', message, links, config.background.show));
    }
    this.emit(':saveState', true);
  },
  'SessionEndedRequest' : function () {
    // SHOULD I CLEAR THE STATE?
    this.attributes.HEARD_FIRST = 0;
    console.log("HOME PAGE session end", JSON.stringify(this.event.request, null,2));
    this.response.speak('See you later. Say Alexa, Make Me Smart to get learning again.')
    this.emit(':saveState');
   },
   'Unhandled' : function () {
     console.log('HOME PAGE  UNHANDLED',JSON.stringify(this.event, null, 2))
     var message = "Sorry I couldn't quite understand that. Make sure to use the numbers before the topics if you're having trouble. ";
     var prompt = "Say 'what's new' to hear the options or 'play the latest' to hear the latest explainer."
     this.response.speak(message + prompt).listen(prompt);
     if (this.event.context.System.device.supportedInterfaces.Display) {
       var links = "<action value='HomePage'>What's New</action> | <action value='ListExplainers'>List Explainers</action>";
       this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Help', message + prompt, null, config.background.show));
     }
     this.emit(':saveState', true);

   }
});
