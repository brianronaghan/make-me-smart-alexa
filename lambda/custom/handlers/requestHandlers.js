'use strict';

var Alexa = require('alexa-sdk');

var config = require('../config');
var util = require('../util');

var explainers = require('../explainers')
var db = require('../db');

module.exports = Alexa.CreateStateHandler(config.states.REQUEST, {
  'PickItem': function (slot) {
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    var slot = slot || this.event.request.intent.slots;
    var message = '';
    var boundThis = this;
    var payload = {}

    if (slot.query && !slot.query.value) { // came here without a query
      console.log("INTENT ", this.event.request.intent);
      // var newIntent = this.event.request.intent;
      // newIntent.name = 'PickItem';
      // console.log("NEW INTENT",newIntent);
      message = "What would you like to get smart about?";
      this.emit(':elicitSlotWithCard', 'query', message, "What would you like to request an explainer about?", 'Request Explainer',message, this.event.request.intent, util.cardImage(config.icon.full));

    } else if (this.attributes.userName && this.attributes.userLocation && false) { // NOTE: turn off for test/build if we've already got your info
      payload.requests = [{
        query: slot.query.value,
        time: this.event.request.timestamp,
        user: this.attributes.userName,
        location: this.attributes.userLocation
      }];
      console.time('UPDATE-DB-request-saved');
      db.update.call(this, payload, function(err, response) {
        console.timeEnd('UPDATE-DB-request-saved');
        message = `Hmmm, we don't have anything on ${slot.query.value}. But I'll tell Kai and Molly that ${this.attributes.userName} from ${this.attributes.userLocation} wants to get smart about that!`;
        this.handler.state = this.attributes.STATE = config.states.START;
        return util.sendProgressive(
          this.event.context.System.apiEndpoint, // no need to add directives params
          this.event.request.requestId,
          this.event.context.System.apiAccessToken,
          message,
          function (err) {
            if (err) {
              boundThis.emitWithState('HomePage', 'requested', message);
            } else {
              boundThis.emitWithState('HomePage', 'requested');
            }
          }
        );
      });

    } else if (!slot.userName.value) { // NOTE NOT SAVING NAME && !this.attributes.userName
      message += `Hmmm, we don't have anything on ${slot.query.value}. But I'll ask Kai and Molly to look into it. Who should I say is asking?`;
      this.emit(':elicitSlotWithCard', 'userName', message, "What name should I leave?", 'Request Explainer',message, this.event.request.intent, util.cardImage(config.icon.full));
    } else if (!slot.userLocation.value ) { // NOTE NOT SAVING NAME && this.attributes.userLocation
      this.attributes.userName = slot.userName.value;
      var cardMessage = `I'll note that ${slot.userName.value} would like an explainer on ${slot.query.value}. `;
      message += 'And where are you from?';
      cardMessage += message;
      this.emit(':elicitSlotWithCard', 'userLocation', message, "What location should I leave?", 'Request Explainer', cardMessage, this.event.request.intent, util.cardImage(config.icon.full) );
    } else {
      console.log("OKAY, NOW WE HAVE EVEYRTHING for request ", slot)
      this.attributes.userLocation = slot.userLocation.value;
      payload.requests = [{
        query: slot.query.value,
        time: this.event.request.timestamp,
        user: this.attributes.userName,
        location: this.attributes.userLocation
      }];
      console.time('UPDATE-DB-request-new');
      db.update.call(this, payload, function(err, response) {
        console.timeEnd('UPDATE-DB-request-new');
        var confirmationMessage = `Okay, I'll tell Kai and Molly ${slot.userName.value} from ${slot.userLocation.value} asked for an explainer on ${slot.query.value}.`;
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
        this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
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
  },
  'RequestExplainer': function (slot) {
    // NOTE: look at this immediately, I think I have some old code here
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    console.log('REQUEST EVENT', this.event.request)
    var slot = slot || this.event.request.intent.slots;
    var message = '';
    var boundThis = this;
    var chosenExplainer;
    console.log("REQUEST EXPLAINER INTENT ", slot)
    if (slot.query && slot.query.value) {
      chosenExplainer = util.itemPicker(slot, explainers, 'title', 'query');
    }
    if (slot.query && !slot.query.value) { // came here without a query
      // gotta check if the query matches.
        // if it does, go to that.
      message = "What would you like to get smart about?";
      this.emit(':elicitSlotWithCard', 'query', message, "What would you like to request an explainer about?", 'Request Explainer',message, this.event.request.intent, util.cardImage(config.icon.full));
    } else if (slot.query && slot.query.value && chosenExplainer) {
      message = "Actually, we've got you covered there."
      return util.sendProgressive(
        boundThis.event.context.System.apiEndpoint, // no need to add directives params
        boundThis.event.request.requestId,
        boundThis.event.context.System.apiAccessToken,
        message,
        function (err) {
          boundThis.handler.state = boundThis.attributes.STATE = config.states.PLAYING_EXPLAINER;
          boundThis.emitWithState('PickItem', slot, 'REQUEST_RESOLVED');
        }
      );
    } else {
      boundThis.emitWithState('PickItem', slot);
    }
  },
  'HomePage' : function () {
    this.handler.state = this.attributes.STATE = config.states.HOME_PAGE;
    this.emitWithState('HomePage', 'no_message');

  },
  'LaunchRequest' : function () {
    this.handler.state = this.attributes.STATE = config.states.START;
    this.emitWithState('LaunchRequest');
  },

  'ReplayExplainer': function () {
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    console.log('REPLAY exp in REQUEST', this.handler.state)
    this.emitWithState('PickItem', 'REPLAY_FROM_REQUEST');
  },


  // BUILT IN

  'AMAZON.StopIntent' : function() {
    console.log('built in STOP, request')
    // This needs to work for not playing as well
    this.handler.state = this.attributes.STATE = config.states.HOME_PAGE;
    this.emitWithState('HomePage', 'no_welcome', "Got it, I won't put in that request.");

  },
  'AMAZON.CancelIntent' : function() {
    console.log('CANCEL REQUEST STATE');
    // means they don't wnt to leave it.
    this.handler.state = this.attributes.STATE = config.states.HOME_PAGE;
    this.emitWithState('HomePage', 'no_welcome', "Got it, I won't put in that request.");
  },
  'AMAZON.HelpIntent' : function () {
    console.log('Help in REQUEST')
    var message = "You can say 'nevermind' to cancel, or else let us know your name and city so we can give you credit if we answer your question.";
    this.response.speak(message).listen(message);
    if (this.event.context.System.device.supportedInterfaces.Display) {
      var links = "<action value='HomePage'>What's New</action> | <action value='ListExplainers'>List Explainers</action>";
      this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Help', message, links, config.background.show));
    }
    this.emit(':saveState', true);
  },
  'SessionEndedRequest' : function () {
    console.log("SESSION ENDED IN REQUEST")
   },
   'Unhandled' : function () {
     // Just go to start

     console.log("REQUEST unhandled -> event  ", JSON.stringify(this.event.request,null, 2));
     this.handler.state = this.attributes.STATE = config.states.START;
     this.emitWithState('LaunchRequest', 'no_welcome', "Sorry I couldn't quite handle that.");
   }

});
