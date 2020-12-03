'use strict';

var Alexa = require('alexa-sdk');

var config = require('../config');
var util = require('../util');

var db = require('../db');

module.exports = Alexa.CreateStateHandler(config.states.UNRESOLVED, {
  'LaunchRequest': function (slot) {
    delete this.attributes.UNRESOLVED;
    this.handler.state = this.attributes.STATE = config.states.START;
    this.emitWithState('LaunchRequest');
  },
  'PickItem': function (slot) {
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    var slot = slot || this.event.request.intent.slots;
    let message = '';
    let caseText = '';
    let payload = {}
    var boundThis = this;
    let unresolved;

    console.log(`UNRESOLVED PickItem - intentname ${this.event.request.intent.name}... `, JSON.stringify(this.event.request.intent, null, 2));
    console.log("is there an UNRESOLVED IN state?: ", this.attributes.UNRESOLVED);

    if (slot.query && slot.query.value) { // query or topic could be
      let intentCheck = util.intentCheck(slot.query.value);
      let externalCheck = util.externalCheck(slot.query.value);
      if (externalCheck) {
        this.attributes.EXTERNALS = this.attributes.EXTERNALS || 0;
        this.attributes.EXTERNALS++;
        if (this.attributes.EXTERNALS === 1 || (this.attributes.EXTERNALS % config.externalMessageFrequency === 0)) {
          return this.emitWithState('AMAZON.StopIntent', config.externalMessage);
        } else {
          return this.emitWithState('AMAZON.CancelIntent');
        }
      } else if (intentCheck) {
        console.log("UNRESOLVED intentCheck -- slot.query.value ", slot.query.value)
        delete slot.query.value;
        delete this.attributes.UNRESOLVED;
        return this.emitWithState(intentCheck);
      }
      unresolved = util.stripActions(slot.query.value);
      this.attributes.UNRESOLVED = true;
      delete slot.query.value
    } else if (slot.topic && slot.topic.value) {
      unresolved = util.stripActions(slot.topic.value);
      this.attributes.UNRESOLVED = true;
      delete slot.topic.value
    }
    if (unresolved) {
      payload.requests = [{
        query: `UNRES: ${unresolved}`,
        time: this.event.request.timestamp,
        user: this.attributes.userName || 'none',
        location: this.attributes.userLocation || 'none',
      }];
      console.time('DB-unres')
      return db.update.call(this, payload, function(err, response) {
        console.timeEnd('DB-unres');
        console.log("EXPLETIVE CHECK ", unresolved)
        if (util.expletiveCheck(unresolved)) {
          message += `Come on. You think we're allowed to say <say-as interpret-as="expletive">${unresolved}</say-as> on public radio? Let's try that again. `;
          caseText = 'unresolved_expletive'
        } else if (this.event.session.new) {
          message = `Welcome to Make Me Smart! I couldn't find an explainer on ${unresolved}. Let's try again. `;
          caseText = 'unres_external'
        } else {
          message += `I couldn't find an explainer on ${unresolved}. Let's try again. `
          caseText = 'unresolved';
        }
        delete this.attributes.UNRESOLVED;
        boundThis.handler.state = this.attributes.STATE = config.states.ITERATING_EXPLAINER;
        return util.sendProgressive(
          boundThis.event.context.System.apiEndpoint, // no need to add directives params
          boundThis.event.request.requestId,
          boundThis.event.context.System.apiAccessToken,
          message,
          function (err) {
            if (err) {
              console.log("FAILED PROGRESSIVE");
              boundThis.emitWithState('ListExplainers', caseText, "Let's try again. ");
            } else {
              boundThis.emitWithState('ListExplainers', caseText);
            }
          }
        );
      });
    } else {
      console.log("SHOULD NEVER HAPPEN")
      console.log("UNRESOLVED, PickItem - no unresolved", JSON.stringify(this.event.request.intent, null,2))
      delete this.attributes.UNRESOLVED;
      this.handler.state = this.attributes.STATE = config.states.ITERATING_EXPLAINER;
      return this.emitWithState('ListExplainers');

    }
  },

  // STATE CHANGES

  'RequestExplainer': function () {
    console.log("UNRESOLVED RequestExplainer")
    if (this.attributes.UNRESOLVED) {
      console.log("UNRESOLVED -- ARTIFACT -- RequestExplainer, sending back")
      this.emitWithState('PickItem');
    } else {
      this.handler.state = this.attributes.STATE = config.states.REQUEST;
      this.emitWithState('RequestExplainer');
    }

  },
  'ListExplainers': function () {
    console.log("UNRESOLVED ListExplainers")
    if (this.attributes.UNRESOLVED) {
      console.log("UNRESOLVED -- ARTIFACT -- ListExplainers, sending back")
      this.emitWithState('PickItem');
    } else {
      this.handler.state = this.attributes.STATE = config.states.ITERATING_EXPLAINER;
      this.emitWithState('ListExplainers');
    }
  },
  'OlderExplainers': function () {
    console.log("UNRESOLVED OlderExplainers")
    if (this.attributes.UNRESOLVED) {
      console.log("UNRESOLVED -- ARTIFACT -- OlderExplainers, sending back")
      this.emitWithState('PickItem');
    } else {
      this.handler.state = this.attributes.STATE = config.states.ITERATING_EXPLAINER;
      this.emitWithState('OlderExplainers');
    }
  },
  'NewerExplainers': function () {
    console.log("UNRESOLVED NewerExplainers")
    if (this.attributes.UNRESOLVED) {
      console.log("UNRESOLVED -- ARTIFACT -- NewerExplainers, sending back")
      this.emitWithState('ChangeMyInfo');
    } else {
      this.handler.state = this.attributes.STATE = config.states.ITERATING_EXPLAINER;
      this.emitWithState('NewerExplainers');
    }
  },
  'HomePage' : function () {
    console.log("UNRESOLVED HomePage", JSON.stringify(this.event.request, null,2));
    if (this.attributes.UNRESOLVED) {
      this.emitWithState('PickItem');
    } else {
      this.handler.state = this.attributes.STATE = config.states.HOME_PAGE;
      this.emitWithState('HomePage');
    }

  },

  // BUILT IN

  'AMAZON.StopIntent' : function(sentMessage) {
    console.log('UNRESOLVED StopIntent')
    // This needs to work for not playing as well

    delete this.attributes.UNRESOLVED;
    delete this.attributes.STATE;
    this.attributes.STOPS = this.attributes.STOPS || 0;
    this.attributes.STOPS++;
    if (sentMessage) {
      this.response.speak(sentMessage)
    } if (this.attributes.STOPS === 1 || (this.attributes.STOPS % config.stopMessageFrequency === 0)) {
      this.response.speak(config.stopMessage)
    }

    this.emit(':saveState');


  },
  'AMAZON.CancelIntent' : function() {
    console.log('UNRESOLVED CancelIntent');
    // means they don't wnt to leave it.
    delete this.attributes.STATE;
    delete this.attributes.UNRESOLVED;
    // this.response.speak(config.cancelMessage);

    this.emit(':saveState');

  },
  'AMAZON.HelpIntent' : function () {
    console.log('UNRESOLVED HelpIntent')
    var message = "You can hear what's new, browse explainers. Which would you like to do?";
    this.response.speak(message).listen(message);
    delete this.attributes.UNRESOLVED;
    if (this.event.context.System.device.supportedInterfaces.Display) {
      this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Help', message, null, config.background.show));
    }
    this.emit(':saveState', true);
  },
  'SessionEndedRequest' : function () {
    console.log("SessionEnded in UNRESOLVED", JSON.stringify(this.event, null,2))
    this.emit(':saveState', true);

   },
   'Unhandled' : function () {
     console.log("Unhandled in UNRESOLVED", JSON.stringify(this.event, null,2))

     // Just go to start
     var message = "Sorry I couldn't quite understand that. ";
     var prompt = "You can hear what's new, or browse explainers. Which would you like to do?";
     this.response.speak(message + prompt).listen(prompt);
     if (this.event.context.System.device.supportedInterfaces.Display) {
       this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Help', message + prompt, null, config.background.show));
     }
     this.emit(':saveState', true);
   }

});
