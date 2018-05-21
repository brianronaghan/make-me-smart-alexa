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
    console.log("HOME PAGE -> condition message", condition, message)
    var slot = slot || this.event.request.intent.slots;
    if (slot && slot.topic) {
      console.log("WTF NOW?")
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
      intro += "Welcome to Make Me Smart. This week we're ";
    } else {
      intro += "This week we're "
    }
    // I DON'T THINK I NEED TO RESET:
    // this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;

    var topics = explainers.map(function(item) {
      return item.title
    });
    intro += `learning about <prosody pitch="high" volume="x-loud">1) ${topics[this.attributes.HEARD_FIRST + 0]}</prosody>, <prosody volume="x-loud" pitch="high">2) ${topics[this.attributes.HEARD_FIRST + 1]}</prosody>, and <prosody volume="x-loud" pitch="high">3) ${topics[this.attributes.HEARD_FIRST + 2]}</prosody>. You can choose one or say 'play all.' Which would you like to hear?`;


    // On add the and that was to the speech... not for card'
    var links = "<action value='PlayLatestExplainer'>Play All</action>";
    this.response.speak(intro).listen("Which topic would you like to get smart about?");
    // if (this.event.context.System.device.supportedInterfaces.Display) {
    //   this.response.renderTemplate(util.templateBodyTemplate1("Make Me Smart's Latest Topics", intro, links, config.background.show));
    // }
    // HERE
    /*
    ':elicitSlotWithCard': function (slotName, speechOutput, repromptSpeech, cardTitle, cardContent, updatedIntent, imageObj) {
    */
    this.emit(':elicitSlotWithCard', 'topic', intro, "Which would you like to hear?", 'Request Explainer', util.clearProsody(intro), this.event.request.intent, util.cardImage(config.icon.full) );
    // this.emit(':responseReady');


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
    } else {
      return this.emitWithState('PickItem', slot, 'HOME_PAGE')
    }
  },

  'PlayLatestExplainer': function () {
    // this is what 'play all would do'
    this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
    this.emitWithState('PickItem', {index: {value: 1}}, 'HOMEPAGE_LATEST');
  },

  'AMAZON.NextIntent': function () {
    // what should next even do here?
    this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
    this.emitWithState('PickItem', {index: {value: 1}}, 'HOMEPAGE_NEXT');
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
  'AMAZON.HelpIntent' : function () {
    console.log('Help in HOME PAGE')
    var message = "You can pick a topic or choose by number or say 'play all'.";
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
    console.log("PLAYING EXPLAINER session end", JSON.stringify(this.event.request, null,2));
    this.response.speak('See you later. Say Alexa, Make Me Smart to get learning again.')
    this.emit(':saveState');
   },
   'Unhandled' : function () {
     console.log('PLAYING EXPLAINER UNHANDLED',JSON.stringify(this.event, null, 2))
     this.emitWithState('HomePage', 'no_welcome', "Sorry I couldn't quite handle that.");

   }
});
