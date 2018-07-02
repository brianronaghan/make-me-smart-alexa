'use strict';

var Alexa = require('alexa-sdk');

var config = require('../config');
var util = require('../util');

var dynasty = require('dynasty')({ region: process.env.AWS_DEFAULT_REGION });
var sessions = dynasty.table(config.sessionDBName);

var db = require('../db');

module.exports = Alexa.CreateStateHandler(config.states.HOME_PAGE, {
  'LaunchRequest': function () {
    console.log("HOME_PAGE LaunchRequest", this.handler.state)
    this.handler.state = this.attributes.STATE = config.states.START;
    this.emitWithState('LaunchRequest');
  },
  'HomePage': function (condition, message) {
    var slot = slot || this.event.request.intent.slots;
    // console.log("HOME PAGE CONDITION ", condition, ' AND NAME: ', this.event.request.intent.name);
    console.log("HOME PAGE ATTRIBUTES" ,JSON.stringify(this.attributes, null,2));
    if (slot && slot.topic && slot.topic.value && !condition) {
      console.log("GOT topic home", slot)
      return this.emitWithState('PickItem', slot)
    } else if (slot && slot.query && slot.query.value && !condition) {
      let resolvedIntent = util.intentCheck(slot.query.value);
      if (resolvedIntent) {
        console.log(`HOME_PAGE Home Page: got ${slot.query.value} in query.`)
        delete slot.query.value;
        return this.emitWithState(resolvedIntent, slot)
      } else {
        return this.emitWithState('PickItem', slot)
      }
    }
    this.attributes.indices.explainer = 0; // set page to 0
    this.attributes.currentExplainerIndex = -1;
    var intro = '';

    if (this.event.session.new && condition !== 'new_user_from_launch') { // and condition === to something?
      this.attributes.HEARD_FIRST = 0;
      intro += "Welcome back to Make Me Smart. This week we're ";
    } else if (condition === 'requested' || condition === 'unresolved_save') {
      if (message) {
        intro += `${message} `;
      }
      intro += "In the meantime, we're ";
    } else if (condition === 'changed_info') {
      if (message) {
        intro += `${message} `;
      }
      intro += "Now that we've updated your info, we're ";
    } else if (condition === 'no_welcome') {
      if (message) {
        intro += `${message} `;
      }
      intro += "This week we're ";
    } else if (condition === 'from_launch') {
      intro += "We've also been ";
      this.attributes.HEARD_FIRST = 1;
    } else if (condition === 'new_user_from_launch') {
      intro += `<audio src="${config.newUserAudio}" /> This week we're `
    } else if (condition === 'unresolved_decline') {
      if (message) {
        intro += `${message} `;
      }
      intro += "This week we're "
    } else if (condition === 'repeating') {
      intro += "Okay, again, we're ";
    } else {
      intro += "This week we're "
    }
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    var topics = util.liveExplainers().map(function(item) {
      return item.title
    });
    if (!this.attributes.HEARD_FIRST) {
      this.attributes.HEARD_FIRST = 0;
    }
    intro += `learning about <prosody volume="x-loud">1) ${topics[this.attributes.HEARD_FIRST + 0]}</prosody>, <prosody volume="x-loud" >2) ${topics[this.attributes.HEARD_FIRST + 1]}</prosody>, and <prosody volume="x-loud" >3) ${topics[this.attributes.HEARD_FIRST + 2]}</prosody>. You can pick one, play them all, or browse all our explainers. Which would you like to hear?`;
    /*
    ':elicitSlotWithCard': function (slotName, speechOutput, repromptSpeech, cardTitle, cardContent, updatedIntent, imageObj) {
    */
    this.emit(':elicitSlotWithCard', 'query', intro, "Which would you like to hear?", 'Latest Explainers', util.clearProsody(intro), this.event.request.intent, util.cardImage(config.icon.full) );

  },

  'PickItem': function (slot, source) {
    console.log("HOME_PAGE PickItem", JSON.stringify(this.event.request.intent, null,2))
    // set spot in indices

    var slot = slot || this.event.request.intent.slots;
    if (slot && slot.query && slot.query.value) { // since we can't change the goddamn thing if it uses elicit, if it has a query, probably after being elicited
      let resolvedIntent = util.intentCheck(slot.query.value);
      if (resolvedIntent) {
        console.log(`HOME_PAGE PickItem: got ${slot.query.value} in query. REDIRECTING`)
        delete slot.query.value;
        return this.emitWithState(resolvedIntent, slot)
      }
    }
    console.log("HOME_PAGE PickItem, normal")
    this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;

    if (this.attributes.HEARD_FIRST === 1) {
      this.attributes.HEARD_FIRST = 0;
      return this.emitWithState('PickItem', slot, 'HOME_AFTER_LAUNCH')
    } else { // need a separate case to retain launch to what's new
      return this.emitWithState('PickItem', slot, 'HOME_PAGE')
    }


  },

  'RequestExplainer' : function () {
    console.log('HOME_PAGE RequestExplainer - POSSISBLY from REQUESTING artifact');
    var slot = slot || this.event.request.intent.slots;
    if (slot && slot.query && slot.query.value) { // since we can't change the goddamn thing if it uses elicit, if it has a query, probably after being elicited
      let resolvedIntent = util.intentCheck(slot.query.value);
      if (resolvedIntent) {
        console.log(`HOME_PAGE RequestExplainer: got ${slot.query.value} in query.`)
        delete slot.query.value;
        return this.emitWithState(resolvedIntent, slot)
      } else {
        console.log(`HOME_PAGE RequestExplainer: no intent, but query ${slot.query.value}. sending to PickItem`)
        return this.emitWithState('PickItem', slot)
      }
    } else {
      console.log("HOME_PAGE, RequestExplainer, no query, redirect to REQ state")
      this.handler.state = this.attributes.STATE = config.states.REQUEST;
      return this.emitWithState('RequestExplainer', {query: {value:null},userLocation: {value: null}, userName: {value: null}});
    }
  },

  'OlderExplainers' : function () {
    console.log("OlderExplainers in HOME_PAGE");

    this.handler.state = this.attributes.STATE = config.states.ITERATING_EXPLAINER;
    this.emitWithState('OlderExplainers', 'older_from_homepage');
  },

  'NewerExplainers' : function () {
    console.log("NewerExplainers in HOME_PAGE");
    this.handler.state = this.attributes.STATE = config.states.ITERATING_EXPLAINER;
    this.emitWithState('NewerExplainers', 'newer_from_homepage');
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

  'ReplayExplainer': function () {
    console.log("HOME_PAGE state, ReplayExplainer", JSON.stringify(this.event.request, null,2));
    this.emitWithState('HomePage', 'repeating');
  },

  'RepeatOptions': function () {
    console.log("HOME_PAGE state, RepeatOptions", JSON.stringify(this.event.request, null,2));
    this.emitWithState('HomePage', 'repeating');
  },

  'AMAZON.NextIntent': function () {
    // what should next even do here?
    this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
    this.emitWithState('PickItem', {index: {value: 1}}, 'HOMEPAGE_NEXT');
  },
  'ChangeMyInfo' : function () {
    var slot = slot || this.event.request.intent.slots;
    if (slot && slot.query && slot.query.value) { // since we can't change the goddamn thing if it uses elicit, if it has a query, probably after being elicited
      let resolvedIntent = util.intentCheck(slot.query.value);
      if (resolvedIntent) {
        console.log(`HOME_PAGE ChangeMyInfo: got ${slot.query.value} in query.`)
        delete slot.query.value;
        return this.emitWithState(resolvedIntent, slot)
      } else {
        console.log(`HOME_PAGE ChangeMyInfo: no intent, but query ${slot.query.value}. sending to PickItem`)
        return this.emitWithState('PickItem', slot)
      }
    } else {
      console.log("HOME_PAGE, ChangeMyInfo, no query, redirect to REQ state")
      this.handler.state = this.attributes.STATE = config.states.CHANGE_INFO;
      return this.emitWithState('ChangeMyInfo', {query: {value:null},userLocation: {value: null}, userName: {value: null}});
    }

    this.handler.state = this.attributes.STATE = config.states.REQUEST;
    this.emitWithState('ChangeMyInfo');
  },
  'ListExplainers': function () {
    var slot = this.event.request.intent.slots;
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    // if(slot && slot.query && slot.query.value) {
    //   delete slot.query.value;
    // }
    console.log('list Explainers FROM HOME PAGE')
    console.log(JSON.stringify(this.event.request, null, 2));

    this.attributes.currentExplainerIndex = -1;
    this.attributes.indices.explainer = 0;
    this.attributes.HEARD_FIRST = 0;
    this.handler.state = this.attributes.STATE = config.states.ITERATING_EXPLAINER;
    // this just throws to the correct state version of itself
    this.emitWithState('ListExplainers');
  },

  'AMAZON.CancelIntent' : function() {
    console.log('CANCEL HOME PAGE')
    // This needs to work for not playing as well
    delete this.attributes.STATE;
    this.attributes.HEARD_FIRST = 0;
    // this.response.speak(config.cancelMessage);
    this.emit(':saveState');
  },
  'AMAZON.StopIntent' : function() {
    console.log('STOP HOME PAGE STATE')
    // This needs to work for not playing as well
    // SHOULD I CLEAR THE STATE?
    this.attributes.HEARD_FIRST = 0;
    delete this.attributes.STATE;
    this.attributes.STOPS = this.attributes.STOPS || 0;
    this.attributes.STOPS++;
    if (this.attributes.STOPS === 1 || (this.attributes.STOPS % config.stopMessageFrequency === 0)) {
      this.response.speak(config.stopMessage)
    }
    this.emit(':saveState');
  },

  'AMAZON.HelpIntent' : function () {
    console.log('Help in HOME PAGE')
    let NAME_TESTING = Object.keys(config.testIds).indexOf(this.attributes.userId) > -1;
    if (NAME_TESTING) {
      console.log('clearing name and location for test')
      delete this.attributes.userName;
      delete this.attributes.userLocation;
    }
    var message = `You can pick an explainer by name or ${config.ipaNumber}, browse our explainers, or play them all. What would you like to do?`;
    this.response.speak(message).listen(message);
    if (this.event.context.System.device.supportedInterfaces.Display) {
      this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Help', util.clearProsody(message), null, config.background.show));
    }
    this.emit(':saveState', true);
  },
  'SessionEndedRequest' : function () {
    // SHOULD I CLEAR THE STATE?
    this.attributes.HEARD_FIRST = 0;
    console.log("HOME PAGE session end", JSON.stringify(this.event.request, null,2));
    this.emit(':saveState');
   },
   'Unhandled' : function () {
     console.log('HOME PAGE  UNHANDLED',JSON.stringify(this.event, null, 2))
     var message = "Sorry I couldn't quite understand that. ";
     var prompt = `You can pick an explainer by name or ${config.ipaNumber}, browse our explainers, or play them all. What would you like to do?`;
     this.response.speak(message + prompt).listen(prompt);
     var displayMessage = message + prompt;
     if (this.event.context.System.device.supportedInterfaces.Display) {
       this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Help', util.clearProsody(displayMessage), null, config.background.show));
     }
     this.emit(':saveState', true);

   }
});
