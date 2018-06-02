'use strict';

var Alexa = require('alexa-sdk');

var config = require('../config');
var util = require('../util');

var explainers = require('../explainers')
var db = require('../db');

module.exports = Alexa.CreateStateHandler(config.states.REQUEST, {
  'LaunchRequest': function () {
    console.log("REQUEST LAUNCH REQ", this.handler.state)
    if (this.attributes.startedRequest) {
      delete this.attributes.startedRequest;
    }
    this.handler.state = this.attributes.STATE = config.states.START;
    this.emitWithState('LaunchRequest');
  },
  'PickItem': function (slot) {
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    var slot = slot || this.event.request.intent.slots;
    var message = '';
    var boundThis = this;
    var payload = {}
    console.log(`ARRIVED: REQUEST PickItem - intentname ${this.event.request.intent.name}... `, JSON.stringify(this.event.request.intent, null, 2))

    if (slot.query && !slot.query.value) { // came here without a query
      message = "What would you like to get smart about?";
      return this.emit(':elicitSlotWithCard', 'query', message, "What would you like to request an explainer about?", 'Request Explainer',message, this.event.request.intent, util.cardImage(config.icon.full));
    }
    let suggestion;
    if (slot.query && slot.query.value) { // query or topic could be
      let intentCheck = util.intentCheck(slot.query.value);
      if (intentCheck === 'ChangeMyInfo') {
        delete slot.query.value;
        return this.emitWithState(intentCheck, slot);
      }
      suggestion = slot.query.value;
    } else if (slot.topic && slot.topic.value) {
      suggestion = slot.topic.value;
    }
    let suggestionString;
    if (this.attributes.startedRequest) { // different language if user initiated or just accidentally got here
      suggestionString = `${suggestion}! Great idea!`
    } else {
      // NOTE: if the user didn't do this intentionally, should we ask them if they want to save it?
      suggestionString = `Hmmm, we don't have anything on ${suggestion}. But `
    }

    if (suggestion && this.attributes.userName && this.attributes.userLocation) { // turn off for testing
      console.log("REQUEST PickItem using saved name/location", slot)
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
        if (slot && slot.query && slot.query.value) {
          delete slot.query.value
        } else if (slot && slot.query && slot.query.value) {
          delete slot.topic.value
        }
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
        var confirmationMessage = `Okay, I'll tell Kai and Molly ${slot.userName.value} from ${slot.userLocation.value} asked for an explainer on ${suggestion}. If they use your suggestion, they'll thank you! If you want to change your name or city in the future you can say 'change my info'. `;
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
    } else { // no userLocation or userName slot
      console.log('REQUEST PickItem at the no slot GENERAL ELSE:', JSON.stringify(this.event.request.intent, null, 2))
    //   delete this.attributes.startedRequest;
    //   payload.requests = [{
    //     query: suggestion,
    //     time: this.event.request.timestamp,
    //     user: 'none',
    //     location: 'none'
    //   }];
    //   console.time('UPDATE-DB-request-nouserslot');
    //
    //   db.update.call(this, payload, function(err, response) {
    //     console.timeEnd('UPDATE-DB-request-nouserslot');
    //     var confirmationMessage = `${suggestionString} I'll tell Kai and Molly you want to get smart about that! If you say 'add my info,' you can tell me your name and city so we can thank you if we use your idea. `;
    //     if (this.event.context.System.device.supportedInterfaces.Display) {
    //       this.response.renderTemplate(
    //         util.templateBodyTemplate1(
    //           'Request Received!',
    //           confirmationMessage,
    //           '',
    //           config.background.show
    //         )
    //       );
    //     }
    //     if (slot && slot.query && slot.query.value) {
    //       delete slot.query.value
    //     } else if (slot && slot.query && slot.query.value) {
    //       delete slot.topic.value
    //     }
    //     this.handler.state = this.attributes.STATE = config.states.HOME_PAGE;
    //     return util.sendProgressive(
    //       this.event.context.System.apiEndpoint, // no need to add directives params
    //       this.event.request.requestId,
    //       this.event.context.System.apiAccessToken,
    //       confirmationMessage,
    //       function (err) {
    //         if (err) {
    //           boundThis.emitWithState('HomePage', 'requested', confirmationMessage);
    //         } else {
    //           boundThis.emitWithState('HomePage', 'requested');
    //         }
    //       }
    //     );
    //   });
    //
    }
  },
  'RequestExplainer': function (slot) {
    if (this.attributes.changingInfo) {
      this.emitWithState('ChangeMyInfo');
    }
    // NOTE: look at this immediately, I think I have some old code here
    console.log('REQUEST, RequestExplainer, slot passed?', slot)
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    this.attributes.startedRequest = true;
    var slot = slot || this.event.request.intent.slots;
    var message = '';
    var boundThis = this;
    var chosenExplainer;
    console.log("REQUEST state RequestExplainer INTENT ", JSON.stringify(this.event.request.intent, null, 2))
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
      console.log("REQUEST state RequestExplainer ", slot.query.value)
      let intentCheck = util.intentCheck(slot.query.value);
      if (intentCheck === 'RequestExplainer') {
        console.log("REQUEST EXPLAINER CLEAR THE QUERY" )
        // If the dumb queryAPI has resolved to RequestExplainer and also flagged the utterance as the query
        slot.query.value = null;
        return boundThis.emitWithState('PickItem', slot);
      } else if (intentCheck) {
        console.log('RequestExplainer gets ', slot.query.value)
        boundThis.emitWithState(intentCheck, slot);
      } else {
        console.log("REQUEST state RequestExplainer, HAVE A QUERY, redirect to pick ", slot, this.event.request);
        boundThis.emitWithState('PickItem', slot);
      }
    } else { // no query?
      console.log("REQUEST state RequestExplainer, NO QUERY ELSE ", slot, this.event.request);
      boundThis.emitWithState('PickItem', slot);

    }
  },
  'ListExplainers': function () {
    console.log("REQUEST, ListExpainers")
    var slot = slot || this.event.request.intent.slots;
    if (slot && slot.query && slot.query.value) {
      let resolvedIntent = util.intentCheck(slot.query.value);
      if (resolvedIntent) {
        console.log(`REQUEST ListExplainers: got ${slot.query.value} in query.`)
        delete slot.query.value;
        return this.emitWithState(resolvedIntent, slot);
      } else {
        console.log("has non-intent query, redirect to pick")
        return this.emitWithState('PickItem', slot);
      }
    } else {
      console.log('NO QUERY redirect to list')
      this.handler.state = this.attributes.STATE = config.states.LIST_EXPLAINERS;
      return this.emitWithState('ListExpainers', slot);

    }
  },
  'HomePage' : function () {
    if (this.attributes.changingInfo) {
      this.emitWithState('ChangeMyInfo');
    }
    var slot = slot || this.event.request.intent.slots;
    if (slot && slot.query && slot.query.value) {
      let resolvedIntent = util.intentCheck(slot.query.value);
      if (resolvedIntent) {
        console.log(`REQUEST HomePage: got ${slot.query.value} in query.`)
        delete slot.query.value;
        return this.emitWithState(resolvedIntent, slot);
      } else {
        console.log("REQUEST HomePage has slot query, redirect to pick")
        return this.emitWithState('PickItem', slot);

      }
    } else {
      console.log('NO QUERY redirect to HomePage');
      this.handler.state = this.attributes.STATE = config.states.HOME_PAGE;
      this.emitWithState('HomePage', 'no_welcome');
    }
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

  'ChangeMyInfo': function () {
    var message = '';
    delete this.attributes.startedRequest;
    var slot = slot || this.event.request.intent.slots;
    this.attributes.changingInfo = true;
    if (slot && slot.userName && !slot.userName.value) {
      message += `Okay, you'd like to change your information. What should I save your first name as for requests?`;
      this.emit(':elicitSlotWithCard', 'userName', message, "What name should I save?", 'Save a name',message, this.event.request.intent, util.cardImage(config.icon.full));
   } else if (slot && slot.userLocation && !slot.userLocation.value) {
     this.attributes.userName = slot.userName.value;
     slot.query.value = 'change my info';
     message = `Okay, whenever you leave a request I'll note it as from ${slot.userName.value}. We also give a location when citing you on the show. Where should I say you're from?`
     this.emit(':elicitSlotWithCard', 'userLocation', message, "Where are you from?", 'Save your location',message, this.event.request.intent, util.cardImage(config.icon.full));
   } else {
     this.attributes.userLocation = slot.userLocation.value;
     delete slot.query.value;
     delete slot.userLocation.value;
     delete slot.userName.value;
     delete this.attributes.changingInfo;
     console.log('NEW INFO : ', this.attributes.userName, this.attributes.userLocation)

     message += `Okay, I've saved your information. If Kai and Molly use one of your suggestions they'll thank ${this.attributes.userName} from ${this.attributes.userLocation} on the show! `;

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
           boundThis.emitWithState('HomePage', 'requested', confirmationMessage);
         } else {
           boundThis.emitWithState('HomePage', 'requested');
         }
       }
     );

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
    var message = `You can cancel, or let us know your name and city so we can give you credit if we answer your question, or 'change my info' to correct your name or location.`;
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
     var prompt = "You can hear what's new or suggest a topic. Which would you like to do?";
     this.response.speak(message + prompt).listen(prompt);
     if (this.event.context.System.device.supportedInterfaces.Display) {
       this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Help', message + prompt, null, config.background.show));
     }
     this.emit(':saveState', true);
   }

});
