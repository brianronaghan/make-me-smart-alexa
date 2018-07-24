'use strict';

var Alexa = require('alexa-sdk');

var config = require('../config');
var util = require('../util');

var db = require('../db');

module.exports = Alexa.CreateStateHandler(config.states.CHANGE_INFO, {
  'LaunchRequest': function () {
    console.log("CHANGE_INFO LaunchRequest", this.attributes)
    this.handler.state = this.attributes.STATE = config.states.START;
    this.emitWithState('LaunchRequest');
  },

  'ChangeMyInfo': function () {
    console.log("CHANGE_INFO ChangeMyInfo", JSON.stringify(this.event.request.intent, null,2))
    var message = '';
    delete this.attributes.startedRequest;
    this.attributes.changingInfo = true;
    var boundThis = this;
    var slot = slot || this.event.request.intent.slots;
    if (slot && slot.userName && !slot.userName.value) {
      message += `Okay, you'd like to change your information. What should I save your first name as for requests?`;
      this.emit(':elicitSlotWithCard', 'userName', message, "What first name should I save?", 'Save a name',message, this.event.request.intent, util.cardImage(config.icon.full));
   } else if (slot && slot.userLocation && !slot.userLocation.value) {
     let intentCheck = util.intentCheck(slot.userName.value);
     if (intentCheck) {
       console.log("CHANGE_INFO ChangeInfo intentCheck -- slot.userName.value ", slot.userName.value)
       delete slot.userName.value;
       delete this.attributes.changingInfo;
       return this.emitWithState(intentCheck);
     }
     console.log("Setting name as ", slot.userName.value)
     this.attributes.userName = slot.userName.value;
     message = `Okay, whenever you leave a request I'll note it as from ${slot.userName.value}. We also give a location when thanking you. What city or state should I say you're from?`
     this.emit(':elicitSlotWithCard', 'userLocation', message, "What city or state are you from?", 'Save your location',message, this.event.request.intent, util.cardImage(config.icon.full));
   } else {
     let intentCheck = util.intentCheck(slot.userLocation.value);

     if (intentCheck) {
       console.log("CHANGE_INFO ChangeInfo intentCheck -- slot.userLocation.value ", slot.userLocation.value)
       if (slot.userLocation && slot.userLocation.value) {
         delete slot.userLocation.value;
       }
       if (slot.userName && slot.userName.value) {
         delete slot.userName.value;
       }
       delete this.attributes.changingInfo;
       return this.emitWithState(intentCheck);
     }

     console.log("Setting location as ", slot.userLocation.value)
     this.attributes.userLocation = slot.userLocation.value;
     if (slot.query && slot.query.value) {
       delete slot.query.value;
     }
     if (slot.userLocation && slot.userLocation.value) {
       delete slot.userLocation.value;
     }
     if (slot.userName && slot.userName.value) {
       delete slot.userName.value;
     }
     delete this.attributes.changingInfo;

     message += `Okay, I've saved your information. If Kai and Molly use one of your ideas they'll thank ${this.attributes.userName} from ${this.attributes.userLocation}! `;

     this.handler.state = this.attributes.STATE = config.states.HOME_PAGE;
     if (this.event.context.System.device.supportedInterfaces.Display) {
       this.response.renderTemplate(
         util.templateBodyTemplate1(
           'Name and location information changed!',
           message,
           '',
           config.background.show
         )
       );
     }
     return util.sendProgressive(
       this.event.context.System.apiEndpoint, // no need to add directives params
       this.event.request.requestId,
       this.event.context.System.apiAccessToken,
       message,
       function (err) {
         if (err) {
           boundThis.emitWithState('HomePage', 'changed_info', confirmationMessage);
         } else {
           boundThis.emitWithState('HomePage', 'changed_info');
         }
       }
     );

   }
  },

  'PickItem': function () {
    console.log("CHANGE_INFO PickItem", JSON.stringify(this.event.request.intent, null,2));
    if (this.attributes.changingInfo) {
      delete this.attributes.changingInfo;
    }
    this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
    this.emitWithState('PickItem');
  },

  'RequestExplainer': function () {
    console.log("CHANGE_INFO RequestExplainer")
    if (this.attributes.changingInfo) {
      console.log("CHANGE_INFO -- ARTIFACT -- RequestExplainer, sending back")
      this.emitWithState('ChangeMyInfo');
    } else {
      this.handler.state = this.attributes.STATE = config.states.REQUEST;
      this.emitWithState('RequestExplainer');
    }

  },
  'ListExplainers': function () {
    console.log("CHANGE_INFO ListExplainers")
    if (this.attributes.changingInfo) {
      console.log("CHANGE_INFO -- ARTIFACT -- ListExplainers, sending back")
      this.emitWithState('ChangeMyInfo');
    } else {
      this.handler.state = this.attributes.STATE = config.states.ITERATING_EXPLAINER;
      this.emitWithState('ListExplainers');
    }
  },
  'OlderExplainers': function () {
    console.log("CHANGE_INFO OlderExplainers")
    if (this.attributes.changingInfo) {
      console.log("CHANGE_INFO -- ARTIFACT -- OlderExplainers, sending back")
      this.emitWithState('ChangeMyInfo');
    } else {
      this.handler.state = this.attributes.STATE = config.states.ITERATING_EXPLAINER;
      this.emitWithState('OlderExplainers');
    }
  },
  'NewerExplainers': function () {
    console.log("CHANGE_INFO NewerExplainers")
    if (this.attributes.changingInfo) {
      console.log("CHANGE_INFO -- ARTIFACT -- NewerExplainers, sending back")
      this.emitWithState('ChangeMyInfo');
    } else {
      this.handler.state = this.attributes.STATE = config.states.ITERATING_EXPLAINER;
      this.emitWithState('NewerExplainers');
    }
  },

  'HomePage' : function () {
    console.log("CHANGE_INFO HomePage")
    if (this.attributes.changingInfo) {
      this.emitWithState('ChangeMyInfo');
    } else {
      this.handler.state = this.attributes.STATE = config.states.HOME_PAGE;
      this.emitWithState('HomePage');

    }

  },

  // BUILT IN

  'AMAZON.StopIntent' : function() {
    console.log('CHANGE_INFO StopIntent')
    // This needs to work for not playing as well
    delete this.attributes.changingInfo;
    delete this.attributes.STATE;
    this.attributes.STOPS = this.attributes.STOPS || 0;
    this.attributes.STOPS++;
    if (this.attributes.STOPS === 1 || (this.attributes.STOPS % config.stopMessageFrequency === 0)) {
      this.response.speak(config.stopMessage)
    }

    this.emit(':saveState');

    // this.handler.state = this.attributes.STATE = config.states.HOME_PAGE;
    // this.emitWithState('HomePage', 'no_welcome', "Got it, I won't put in that request.");

  },
  'AMAZON.CancelIntent' : function() {
    console.log('CHANGE_INFO CancelIntent');
    // means they don't wnt to leave it.
    delete this.attributes.STATE;
    delete this.attributes.changingInfo;
    // this.response.speak(config.cancelMessage);
    this.emit(':saveState');

  },
  'AMAZON.HelpIntent' : function () {
    console.log('CHANGE_INFO HelpIntent')
    var message = `You can say cancel, or say 'change my info' to let us know your name and city so we can give you credit if we use your idea. What would you like to do?`;
    this.response.speak(message).listen(message);
    if (this.event.context.System.device.supportedInterfaces.Display) {
      this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Help', message, null, config.background.show));
    }
    this.emit(':saveState', true);
  },
  'SessionEndedRequest' : function () {
    console.log("SessionEnded in CHANGE_INFO", JSON.stringify(this.event, null,2))
   },
   'Unhandled' : function () {
     console.log("Unhandled in CHANGE_INFO", JSON.stringify(this.event, null,2))

     // Just go to start
     var message = "Sorry I couldn't quite understand that. ";
     var prompt = "You can say cancel, or say 'change my info' to let us know your name and city so we can give you credit if we use your idea. What would you like to do?";
     this.response.speak(message + prompt).listen(prompt);
     if (this.event.context.System.device.supportedInterfaces.Display) {
       this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Help', message + prompt, null, config.background.show));
     }
     this.emit(':saveState', true);
   }



});
