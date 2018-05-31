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
    console.log("HITS PICK IN REQ")
    // no query/no topic means they initiated request
      // ask for topic
    // query
      //&& startedRequest
        // definitely want to save
      // && save req
        // confirmed they'd like to submit
      // saveReq === no
        // redirect
      // !save req
        // ask them if they'd like to save req

    if (slot.query && !slot.query.value) { // came here without a query
      message = "What would you like to get smart about?";
      return this.emit(':elicitSlotWithCard', 'query', message, "What would you like to request an explainer about?", 'Request Explainer',message, this.event.request.intent, util.cardImage(config.icon.full));
    }
    let suggestion;
    if (slot.query && slot.query.value) {
      let intentCheck = util.intentCheck(slot.query.value);
      if (intentCheck === 'ChangeMyInfo') {
        slot.query.value = null;
       return this.emitWithState(intentCheck, slot);
      }
      suggestion = slot.query.value;
    } else if (slot.topic && slot.topic.value) {
      suggestion = slot.topic.value;
    }
    let suggestionString;
    if (this.attributes.startedRequest) {
      suggestionString = `${suggestion}! Great idea!`
    } else {
      // NOTE: if the user didn't do it intentionally, should we ask them if they want to?
      // SHOULD WE confirm name and location too?
      suggestionString = `Hmmm, we don't have anything on ${suggestion}. But `
    }
    // TODO: check intent? or should we do it before
    if (suggestion && this.attributes.userName && this.attributes.userLocation) {
      payload.requests = [{
        query: suggestion,
        time: this.event.request.timestamp,
        user: this.attributes.userName,
        location: this.attributes.userLocation
      }];
      console.time('UPDATE-DB-request-saved');
      delete this.attributes.startedRequest;
      // NOTE: CONFIRM WE WANT TO SAVE REQUEST?
      db.update.call(this, payload, function(err, response) {
        console.timeEnd('UPDATE-DB-request-saved');
        message = `${suggestionString} I'll tell Kai and Molly that ${this.attributes.userName} from ${this.attributes.userLocation} wants to get smart about that! You can also hear more from Kai and Molly by saying "alexa, play podcast Make Me Smart." `;
        //
        this.handler.state = this.attributes.STATE = config.states.HOME_PAGE;
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
    } else if (slot.userName && !slot.userName.value) {
      message += `${suggestionString} I'll ask Kai and Molly to look into it. Who should I say is asking?`;
      this.emit(':elicitSlotWithCard', 'userName', message, "What name should I leave?", 'Request Explainer',message, this.event.request.intent, util.cardImage(config.icon.full));
    } else if (slot.userLocation && !slot.userLocation.value ) {
      this.attributes.userName = slot.userName.value;
      var cardMessage = `I'll note that ${slot.userName.value} would like an explainer on ${suggestion}. `;
      message += 'And where are you from?';
      cardMessage += message;
      this.emit(':elicitSlotWithCard', 'userLocation', message, "What location should I leave?", 'Request Explainer', cardMessage, this.event.request.intent, util.cardImage(config.icon.full) );
    } else {
      console.log("OKAY, NOW WE HAVE EVEYRTHING for request ", slot);

      this.attributes.userLocation = slot.userLocation.value;
      delete this.attributes.startedRequest;
      payload.requests = [{
        query: suggestion,
        time: this.event.request.timestamp,
        user: this.attributes.userName,
        location: this.attributes.userLocation
      }];
      console.time('UPDATE-DB-request-new');
      db.update.call(this, payload, function(err, response) {
        console.timeEnd('UPDATE-DB-request-new');
        var confirmationMessage = `Okay, I'll tell Kai and Molly ${slot.userName.value} from ${slot.userLocation.value} asked for an explainer on ${suggestion}. You can also hear more from Kai and Molly by saying "alexa, play podcast Make Me Smart." `;
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
  },
  'RequestExplainer': function (slot) {
    // NOTE: look at this immediately, I think I have some old code here
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    console.log('REQUEST EVENT', this.event.request)
    this.attributes.startedRequest = true;
    var slot = slot || this.event.request.intent.slots;
    var message = '';
    var boundThis = this;
    var chosenExplainer;
    console.log("REQUEST EXPLAINER INTENT ", slot)
    if (slot.query && slot.query.value) {
      chosenExplainer = util.itemPicker(slot, explainers, 'title', 'query');
    }
    if (slot.query && !slot.query.value) { // NO QUERY
      message = "What would you like to get smart about?";
      this.emit(':elicitSlotWithCard', 'query', message, "What would you like to request an explainer about?", 'Request Explainer',message, this.event.request.intent, util.cardImage(config.icon.full));
    } else if (slot.query && slot.query.value && chosenExplainer) { // QUERY, but we got the topic
      console.log("ACTUAL REQUEST EXPLAINER INTENT WITH QUERY")
      message = "Actually, we've got you covered there."
      delete this.attributes.startedRequest;
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
    } else if (slot.query && slot.query.value) { //QUERY, but it doesn't match any topic
      let intentCheck = util.intentCheck(slot.query.value);
      if (intentCheck === 'RequestExplainer') {
        console.log("REQUEST EXPLAINER CLEAR THE QUERY" )
        // If the dumb queryAPI has resolved to RequestExplainer and also flagged the utterance as the query
        slot.query.value = null;
        return boundThis.emitWithState('PickItem', slot);
      } else {
        boundThis.emitWithState('PickItem', slot);
      }
    } else {
      boundThis.emitWithState('PickItem', slot);

    }
  },
  'HomePage' : function () {
    this.handler.state = this.attributes.STATE = config.states.HOME_PAGE;
    this.emitWithState('HomePage', 'no_welcome');

  },
  'LaunchRequest' : function () {
    this.handler.state = this.attributes.STATE = config.states.START;
    this.emitWithState('LaunchRequest');
  },
  'PlayLatestExplainer': function () {
    // this is what 'play all would do'
    this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
    this.emitWithState('PickItem', {index: {value: 1}}, 'REQUEST_LATEST');
  },
  'ReplayExplainer': function () {
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    console.log('REPLAY exp in REQUEST', this.handler.state)
    this.emitWithState('PickItem', 'REPLAY_FROM_REQUEST');
  },

  ChangeMyInfo: function () {
    var message = '';
    delete this.attributes.startedRequest;
    var slot = slot || this.event.request.intent.slots;

    if (slot && slot.userName && !slot.userName.value) {
      message += `Okay, you'd like to change your information. What should I save your first name as for requests?`;
      this.emit(':elicitSlotWithCard', 'userName', message, "What name should I save?", 'Save a name',message, this.event.request.intent, util.cardImage(config.icon.full));
   } else if (slot && slot.userLocation && !slot.userLocation.value) {
     this.attributes.userName = slot.userName.value;
     message = `Okay, whenever you leave a request I'll note it as from ${slot.userName.value}. We also give a location when citing you on the show. Where should I say you're from?`
     this.emit(':elicitSlotWithCard', 'userLocation', message, "Where are you from?", 'Save your location',message, this.event.request.intent, util.cardImage(config.icon.full));
   } else {
     this.attributes.userLocation = slot.userLocation.value;
     message += `Okay, I've saved your information. If Kai and Molly use one of your suggestions they'll thank ${slot.userName.value} from ${slot.userLocation.value} on the show! If you want to change your information say 'change my info.' For now, you can play the latest explainer or hear what's new. What would you like to do?`;
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
     this.response.speak(message).listen("Would you like to play the latest or hear what's new?");
     console.log('new', this.attributes.userName, this.attributes.userLocation)
     // this.emit(':elicitSlotWithCard', 'userLocation', message, "What location should I leave?", 'Request Explainer', cardMessage, this.event.request.intent, util.cardImage(config.icon.full) );
     this.emit(':saveState');


   }
  },


  // BUILT IN

  'AMAZON.StopIntent' : function() {
    console.log('built in STOP, request')
    // This needs to work for not playing as well
    delete this.attributes.startedRequest;
    delete this.attributes.STATE;
    this.response.speak('See you later. Say Alexa, Make Me Smart to get learning again.')
    this.emit(':saveState');

    // this.handler.state = this.attributes.STATE = config.states.HOME_PAGE;
    // this.emitWithState('HomePage', 'no_welcome', "Got it, I won't put in that request.");

  },
  'AMAZON.CancelIntent' : function() {
    console.log('CANCEL REQUEST STATE');
    // means they don't wnt to leave it.
    delete this.attributes.STATE;
    delete this.attributes.startedRequest;

    this.response.speak('See you later. Say Alexa, Make Me Smart to get learning again.')
    this.emit(':saveState');

    // this.handler.state = this.attributes.STATE = config.states.HOME_PAGE;
    // this.emitWithState('HomePage', 'no_welcome', "Got it, I won't put in that request.");
  },
  'AMAZON.HelpIntent' : function () {
    console.log('Help in REQUEST')
    var message = `You can say 'nevermind' to cancel, let us know your name and city so we can give you credit if we answer your question, or 'change my info' to correct your name or location.`;
    this.response.speak(message).listen(message);
    if (this.event.context.System.device.supportedInterfaces.Display) {
      this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Help', message, links, config.background.show));
    }
    this.emit(':saveState', true);
  },
  'SessionEndedRequest' : function () {
    console.log("SESSION ENDED IN REQUEST", JSON.stringify(this.event, null,2))
   },
   'Unhandled' : function () {
     console.log("UNHANDLED REQUEST", JSON.stringify(this.event, null,2))

     // Just go to start
     var message = "Sorry I couldn't quite understand that. ";
     var prompt = "Say 'request explainer' or 'suggest a topic'.";
     this.response.speak(message + prompt).listen(prompt);
     if (this.event.context.System.device.supportedInterfaces.Display) {
       this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Help', message + prompt, null, config.background.show));
     }
     this.emit(':saveState', true);
   }

});
