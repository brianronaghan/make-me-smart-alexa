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
    let slot = slot || this.event.request.intent.slots;
    let message;
    let confirmMessage;
    let payload = {}
    let intentObj = this.event.request.intent;


    console.log(`UNRESOLVED PickItem - intentname ${this.event.request.intent.name}... `, JSON.stringify(this.event.request.intent, null, 2));

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
          message = `Hmmm, I couldn't find an explainer or understand ${this.attributes.UNRESOLVED}. Would you like to request an explainer on that?`;
          confirmMessage = `Would you like to request an explainer on ${this.attributes.UNRESOLVED}?`;
          return this.emit(':confirmIntentWithCard', message, confirmMessage, 'Explainer Not Found', message);
        }

      } else { // denied
        console.log("UNRESOLVED PickItem -- DENIED", JSON.stringify(intentObj, null,2));
        // TODO: okay: now we, um, go home?
        message = "Alright, then, let's try again.";

        return util.sendProgressive(
          this.event.context.System.apiEndpoint, // no need to add directives params
          this.event.request.requestId,
          this.event.context.System.apiAccessToken,
          message,
          function (err) {
            if (err) {
              boundThis.emitWithState('HomePage', 'unresolved_decline', message);
            } else {
              boundThis.emitWithState('HomePage', 'unresolved_decline');
            }
          }
        );

      }
    } else { // confirmed
      console.log("UNRESOLVED PickItem -- CONFIRMED", JSON.stringify(intentObj, null,2));
      // TODO OKAY: now it's confirmed. We gotta ge tthe info?
      if (suggestion && this.attributes.userName && this.attributes.userLocation) { // turn off for testing
        console.log("REQUEST PickItem using saved name/location", slot)
        payload.requests = [{
          query: suggestion,
          time: this.event.request.timestamp,
          user: this.attributes.userName,
          location: this.attributes.userLocation
        }];
        console.time('UPDATE-DB-request-saved');
        // NOTE: CONFIRM WE WANT TO SAVE REQUEST?
        db.update.call(this, payload, function(err, response) {
          console.timeEnd('UPDATE-DB-request-saved');
          message = `Okay, I'll tell Kai and Molly that ${this.attributes.userName} from ${this.attributes.userLocation} wants to get smart about ${this.attributes.UNRESOLVED}! You can also hear more from Kai and Molly by saying "alexa, play podcast Make Me Smart." `;
          //
          delete this.attributes.UNRESOLVED;
          this.handler.state = this.attributes.STATE = config.states.HOME_PAGE;
          return util.sendProgressive(
            this.event.context.System.apiEndpoint, // no need to add directives params
            this.event.request.requestId,
            this.event.context.System.apiAccessToken,
            message,
            function (err) {
              if (err) {
                boundThis.emitWithState('HomePage', 'unresolved_save', message);
              } else {
                boundThis.emitWithState('HomePage', 'unresolved_save');
              }
            }
          );
        });
      } else if (slot.userName && !slot.userName.value) {
        console.log('Gotta get userName');
        message += `${suggestionString} I'll ask Kai and Molly to look into it. Who should I say is asking?`;
        this.emit(':elicitSlotWithCard', 'userName', message, "What name should I leave?", 'Request Explainer',message, this.event.request.intent, util.cardImage(config.icon.full));
      } else if (slot.userLocation && !slot.userLocation.value ) {
        console.log('Gotta get userLocation');
        this.attributes.userName = slot.userName.value;
        var cardMessage = `I'll note that ${slot.userName.value} would like an explainer on ${suggestion}. `;
        message += 'And where are you from?';
        cardMessage += message;
        this.emit(':elicitSlotWithCard', 'userLocation', message, "What location should I leave?", 'Request Explainer', cardMessage, this.event.request.intent, util.cardImage(config.icon.full) );
      } else if (slot.userName && slot.userName.value && slot.userLocation && slot.userLocation.value) { // WE have filled in both in the cycle

        console.log("HAVE userLocation and userName ", slot);

        this.attributes.userLocation = slot.userLocation.value;
        delete this.attributes.startedRequest;
        payload.requests = [{
          query: suggestion,
          time: this.event.request.timestamp,
          user: this.attributes.userName,
          location: this.attributes.userLocation
        }];
        delete slot.userName.value;
        delete slot.userLocation.value;

        console.time('UPDATE-DB-request-new-name');
        db.update.call(this, payload, function(err, response) {
          console.timeEnd('UPDATE-DB-request-new');
          var confirmationMessage = `Okay, I'll tell Kai and Molly ${this.attributes.userName} from ${this.attributes.userLocation} asked for an explainer on ${suggestion}. If they use your suggestion, they'll thank you! If you want to change your name or city in the future you can say 'change my info'. `;
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
          if (slot && slot.query && slot.query.value) {
            delete slot.query.value
          } else if (slot && slot.query && slot.query.value) {
            delete slot.topic.value
          }
          // TODO: PROMPT NOT REDIRECT?
          this.handler.state = this.attributes.STATE = config.states.HOME_PAGE;
          return util.sendProgressive(
            this.event.context.System.apiEndpoint, // no need to add directives params
            this.event.request.requestId,
            this.event.context.System.apiAccessToken,
            confirmationMessage,
            function (err) {
              if (err) {
                boundThis.emitWithState('HomePage', 'requested', confirmationMessage);
              } else {
                boundThis.emitWithState('HomePage', 'requested');
              }
            }
          );
        });
      }
    }

     else { // no userLocation or userName slot
      console.log('UNRESOLVED PickItem at the no slot GENERAL ELSE:', JSON.stringify(this.event.request.intent, null, 2))
    }
  },

});
