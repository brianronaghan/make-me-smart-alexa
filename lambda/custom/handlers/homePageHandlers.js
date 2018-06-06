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
    console.log("HOME_PAGE LaunchRequest", this.handler.state)
    this.handler.state = this.attributes.STATE = config.states.START;
    this.emitWithState('LaunchRequest');
  },
  'HomePage': function (condition, message) {
    // TODO CHECK NEW USER
    // why did what's new not go here?
    var slot = slot || this.event.request.intent.slots;
    console.log("HOME PAGE CONDITION ", condition, ' AND NAME: ', this.event.request.intent.name)
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

    this.attributes.currentExplainerIndex = -1;
    var intro = '';
    if (this.event.session.new && condition !== 'new_user_from_launch') { // and condition === to something?
      this.attributes.HEARD_FIRST = 0;
      intro += "Welcome back to Make Me Smart. This week we're ";
    } else if (condition === 'requested') {
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
    } else {
      intro += "This week we're "
    }
    var topics = explainers.map(function(item) {
      return item.title
    });
    if(!this.attributes.HEARD_FIRST) {
      this.attributes.HEARD_FIRST = 0;
    }
    intro += `learning about <prosody pitch="high" volume="x-loud">1) ${topics[this.attributes.HEARD_FIRST + 0]}</prosody>, <prosody volume="x-loud" pitch="high">2) ${topics[this.attributes.HEARD_FIRST + 1]}</prosody>, and <prosody volume="x-loud" pitch="high">3) ${topics[this.attributes.HEARD_FIRST + 2]}</prosody>. You can pick one, play them all, or ask for more. Which would you like to hear?`;
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

  'EarlierExplainers' : function () {
    console.log("EARLIER in HOME_PAGE");

    this.handler.state = this.attributes.STATE = config.states.ITERATING_EXPLAINER;
    this.emitWithState('EarlierExplainers', 'earlier_from_homepage');
  },

  'LaterExplainers' : function () {
    console.log("LATER in HOME_PAGE");
    this.handler.state = this.attributes.STATE = config.states.ITERATING_EXPLAINER;
    this.emitWithState('LaterExplainers', 'later_from_homepage');
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
    console.log('s', slot);
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
    this.response.speak("See you later. Say 'Alexa, Make Me Smart' to get learning again.");
    this.emit(':saveState');
  },
  'AMAZON.StopIntent' : function() {
    console.log('STOP HOME PAGE STATE')
    // This needs to work for not playing as well
    // SHOULD I CLEAR THE STATE?
    this.attributes.HEARD_FIRST = 0;
    delete this.attributes.STATE;
    this.response.speak('See you later. Say alexa, Make Me Smart to get learning again.')
    this.emit(':saveState');
  },

  'AMAZON.HelpIntent' : function () {
    console.log('Help in HOME PAGE')
    var message = "You can pick an explainer by name or number, ask for more options, or play them all. What would you like to do?";
    this.response.speak(message).listen(message);
    if (this.event.context.System.device.supportedInterfaces.Display) {
      this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Help', message, null, config.background.show));
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
     var message = "Sorry I couldn't quite understand that. ";
     var prompt = "You can pick an explainer by name or number, ask for more options, or play them all. What would you like to do?";
     this.response.speak(message + prompt).listen(prompt);
     if (this.event.context.System.device.supportedInterfaces.Display) {
       this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Help', message + prompt, null, config.background.show));
     }
     this.emit(':saveState', true);

   }
});
