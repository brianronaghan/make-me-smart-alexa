'use strict';

var Alexa = require('alexa-sdk');

var config = require('../config');
var util = require('../util');

var explainers = require('../explainers')
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
    let confirmMessage;
    let payload = {}
    let intentObj = this.event.request.intent;
    var boundThis = this;

    console.log(`UNRESOLVED PickItem - intentname ${this.event.request.intent.name}... `, JSON.stringify(this.event.request.intent, null, 2));
    console.log("UN ", this.attributes.UNRESOLVED);
    let unresolved;
    if (slot.query && slot.query.value) { // query or topic could be
      unresolved = slot.query.value;
      delete slot.query.value
    } else if (slot.topic && slot.topic.value) {
      unresolved = slot.topic.value;
      delete slot.topic.value
    }
    if (unresolved) {
      this.attributes.UNRESOLVED = unresolved;
    }

    if (intentObj.confirmationStatus !== 'CONFIRMED') {
      if (intentObj.confirmationStatus !== 'DENIED') { // neither
        console.log("UNRESOLVED PickItem -- NEITHER CONFIRM NOR DENY", JSON.stringify(intentObj, null,2));

        if (unresolved) {
          message = `Hmmm, I couldn't quite understand ${this.attributes.UNRESOLVED}. Would you like to request an explainer on that?`;
          confirmMessage = `Would you like to request an explainer on ${this.attributes.UNRESOLVED}?`;
          return this.emit(':confirmIntentWithCard', message, confirmMessage, 'Explainer Not Found', message);
        }

      } else { // denied
        console.log("UNRESOLVED PickItem -- DENIED", JSON.stringify(intentObj, null,2));
        // TODO: okay: now we, um, go home?
        message = "Alright, let's try again.";
        delete this.attributes.UNRESOLVED;
        delete intentObj.confirmationStatus;
        this.handler.state = this.attributes.STATE = this.attributes.PICK_SOURCE || config.states.HOME_PAGE;
        let redirectIntent = config.state_start_intents[this.attributes.STATE];
        delete this.attributes.PICK_SOURCE;
        return util.sendProgressive(
          this.event.context.System.apiEndpoint, // no need to add directives params
          this.event.request.requestId,
          this.event.context.System.apiAccessToken,
          message,
          function (err) {
            if (err) {
              boundThis.emitWithState(redirectIntent, 'unresolved_decline', message);
            } else {
              boundThis.emitWithState(redirectIntent, 'unresolved_decline');
            }
          }
        );

      }
    } else { // confirmed
      console.log("UNRESOLVED PickItem -- CONFIRMED", JSON.stringify(intentObj, null,2));
      // TODO OKAY: now it's confirmed. We gotta ge tthe info?
      if (this.attributes.UNRESOLVED && this.attributes.userName && this.attributes.userLocation) { // turn off for testing
        console.log("REQUEST PickItem using saved name/location", slot)
        payload.requests = [{
          query: this.attributes.UNRESOLVED,
          time: this.event.request.timestamp,
          user: this.attributes.userName,
          location: this.attributes.userLocation
        }];
        console.time('DB-unresolved-saved');

        db.update.call(this, payload, function(err, response) {
          console.timeEnd('DB-unresolved-saved');
          message = `Okay, I'll tell Kai and Molly that ${this.attributes.userName} from ${this.attributes.userLocation} wants to get smart about ${this.attributes.UNRESOLVED}! You can also hear more from Kai and Molly by saying "alexa, play podcast Make Me Smart." Now let's try again: `;
          //
          delete this.attributes.UNRESOLVED;
          delete intentObj.confirmationStatus


          this.handler.state = this.attributes.STATE = this.attributes.PICK_SOURCE || config.states.HOME_PAGE;
          let redirectIntent = config.state_start_intents[this.attributes.STATE];
          delete this.attributes.PICK_SOURCE;

          return util.sendProgressive(
            this.event.context.System.apiEndpoint, // no need to add directives params
            this.event.request.requestId,
            this.event.context.System.apiAccessToken,
            message,
            function (err) {
              if (err) {
                boundThis.emitWithState(redirectIntent, 'unresolved_save', message);
              } else {
                boundThis.emitWithState(redirectIntent, 'unresolved_save');
              }
            }
          );
        });
      } else if (slot.userName && !slot.userName.value) {
        console.log('Gotta get userName');
        message += `Okay, I'll ask Kai and Molly to look into ${this.attributes.UNRESOLVED}. Who should I say is asking?`;
        this.emit(':elicitSlotWithCard', 'userName', message, "What name should I leave?", 'Request Explainer',message, this.event.request.intent, util.cardImage(config.icon.full));
      } else if (slot.userLocation && !slot.userLocation.value ) {
        // TODO: intentCHeck?
        let intentCheck = util.intentCheck(slot.userName.value);
        if (intentCheck) {
          console.log("UNRESOLVED PickItem intentCheck -- slot.userName.value ", slot.userName.value)
          if (slot.query && slot.query.value) {
            delete slot.query.value
          }
          delete slot.userName.value;
          delete intentObj.confirmationStatus
          delete this.attributes.UNRESOLVED;
          return this.emitWithState(intentCheck);
        }

        console.log('Gotta get userLocation');
        this.attributes.userName = slot.userName.value;
        var cardMessage = `I'll note that ${slot.userName.value} would like an explainer on ${this.attributes.UNRESOLVED}. `;
        message += 'And where are you from?';
        cardMessage += message;
        this.emit(':elicitSlotWithCard', 'userLocation', message, "What location should I leave?", 'Request Explainer', cardMessage, this.event.request.intent, util.cardImage(config.icon.full) );
      } else if (slot.userName && slot.userName.value && slot.userLocation && slot.userLocation.value) { // WE have filled in both in the cycle
        let intentCheck = util.intentCheck(slot.userName.value);
        if (intentCheck) {
          console.log("UNRESOLVED PickItem intentCheck -- slot.userLocation.value ", slot.userLocation.value)
          if (slot.query && slot.query.value) {
            delete slot.query.value
          }
          delete slot.userName.value;
          delete slot.userLocation.value;
          delete intentObj.confirmationStatus;
          delete this.attributes.UNRESOLVED;
          return this.emitWithState(intentCheck);
        }
        console.log("HAVE userLocation and userName ", slot);

        this.attributes.userLocation = slot.userLocation.value;
        payload.requests = [{
          query: this.attributes.UNRESOLVED,
          time: this.event.request.timestamp,
          user: this.attributes.userName,
          location: this.attributes.userLocation
        }];
        console.time('DB-unresolved-new-name');

        db.update.call(this, payload, function(err, response) {
          console.timeEnd('DB-unresolved-new-name');
          var confirmationMessage = `Okay, I'll tell Kai and Molly ${this.attributes.userName} from ${this.attributes.userLocation} asked for an explainer on ${this.attributes.UNRESOLVED}. If they use your idea, they'll thank you! If you want to change your name or city in the future you can say 'change my info'. Now try choosing again. `;
          if (this.event.context.System.device.supportedInterfaces.Display) {
            this.response.renderTemplate(
              util.templateBodyTemplate1(
                'Request Received!',
                confirmationMessage,
                '',
                config.background.show
              )
            );
          }
          delete this.attributes.UNRESOLVED;
          delete slot.userName.value;
          delete slot.userLocation.value;
          delete intentObj.confirmationStatus
          if (slot.query && slot.query.value) {
            delete slot.query.value
          } else if (slot && slot.query && slot.query.value) {
            delete slot.topic.value
          }

          // TODO: PROMPT NOT REDIRECT?

          this.handler.state = this.attributes.STATE = this.attributes.PICK_SOURCE || config.states.HOME_PAGE;
          let redirectIntent = config.state_start_intents[this.attributes.STATE];
          delete this.attributes.PICK_SOURCE;

          return util.sendProgressive(
            this.event.context.System.apiEndpoint, // no need to add directives params
            this.event.request.requestId,
            this.event.context.System.apiAccessToken,
            confirmationMessage,
            function (err) {
              if (err) {
                boundThis.emitWithState(redirectIntent, 'unresolved_save', confirmationMessage);
              } else {
                boundThis.emitWithState(redirectIntent, 'unresolved_save');
              }
            }
          );
        });
      } else { //IS  CONFIRMED, don't have userName/userLocation
        console.log('UNRESOLVED PickItem at the no slot GENERAL ELSE:', JSON.stringify(this.event.request.intent, null, 2))
      }
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
      this.emitWithState('ListExlpainers');
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
    console.log("UNRESOLVED HomePage")
    if (this.attributes.UNRESOLVED) {
      this.emitWithState('PickItem');
    } else {
      this.handler.state = this.attributes.STATE = config.states.HOME_PAGE;
      this.emitWithState('HomePage');
    }

  },

  // BUILT IN

  'AMAZON.StopIntent' : function() {
    console.log('UNRESOLVED StopIntent')
    // This needs to work for not playing as well
    delete this.attributes.UNRESOLVED;
    delete this.attributes.STATE;
    this.response.speak('See you later. Say Alexa, Make Me Smart to get learning again.')
    this.emit(':saveState');

    // this.handler.state = this.attributes.STATE = config.states.HOME_PAGE;
    // this.emitWithState('HomePage', 'no_welcome', "Got it, I won't put in that request.");

  },
  'AMAZON.CancelIntent' : function() {
    console.log('UNRESOLVED CancelIntent');
    // means they don't wnt to leave it.
    delete this.attributes.STATE;
    delete this.attributes.UNRESOLVED;

    this.response.speak('See you later. Say Alexa, Make Me Smart to get learning again.')
    this.emit(':saveState');

  },
  'AMAZON.HelpIntent' : function () {
    console.log('UNRESOLVED HelpIntent')
    var message = "You can hear what's new, or browse explainers, or submit an idea for an explainer. Which would you like to do?";
    this.response.speak(message).listen(message);
    delete this.attributes.UNRESOLVED;
    if (this.event.context.System.device.supportedInterfaces.Display) {
      this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Help', message, null, config.background.show));
    }
    this.emit(':saveState', true);
  },
  'SessionEndedRequest' : function () {
    console.log("SessionEnded in UNRESOLVED", JSON.stringify(this.event, null,2))
   },
   'Unhandled' : function () {
     console.log("Unhandled in UNRESOLVED", JSON.stringify(this.event, null,2))

     // Just go to start
     var message = "Sorry I couldn't quite understand that. ";
     var prompt = "You can hear what's new, or browse explainers, or submit an idea for an explainer. Which would you like to do?";
     this.response.speak(message + prompt).listen(prompt);
     if (this.event.context.System.device.supportedInterfaces.Display) {
       this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Help', message + prompt, null, config.background.show));
     }
     this.emit(':saveState', true);
   }

});
