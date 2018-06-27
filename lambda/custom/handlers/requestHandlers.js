'use strict';

var Alexa = require('alexa-sdk');

var config = require('../config');
var util = require('../util');

var db = require('../db');

module.exports = Alexa.CreateStateHandler(config.states.REQUEST, {
  'LaunchRequest': function () {
    if (this.attributes.SUGGESTION) {
      console.log("THERE's an unfilled sugg ", this.attributes.SUGGESTION);
      var payload = {};
      payload.requests = [{
        query: this.attributes.SUGGESTION,
        time: this.event.request.timestamp,
        user: this.attributes.userName || this.attributes.userId,
        location: this.attributes.userLocation || 'not_entered',
        condition: 'rescued_launch'
      }];
      return db.update.call(this, payload, function(err, response) {
        delete this.attributes.SUGGESTION; // temporary... eventually, we should handle if they come back and had previous suggestion
        delete this.attributes.requestingExplainer;
        this.handler.state = this.attributes.STATE = config.states.START;
        this.emitWithState('LaunchRequest');
      });
    }
    this.handler.state = this.attributes.STATE = config.states.START;
    this.emitWithState('LaunchRequest');
  },
  'RequestExplainer': function (slot) {
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    var slot = slot || this.event.request.intent.slots;
    var message = '';
    var boundThis = this;
    var payload = {}
    var intentObj = this.event.request.intent;
    this.attributes.requestingExplainer = true;
    console.log(`REQUEST requestingExplainer - ENTRY intentName ${this.event.request.intent.name}... `, JSON.stringify(this.event.request, null, 2));
    if (slot.query && slot.query.value) {
      let intentCheck = util.intentCheck(slot.query.value);
      if (intentCheck) {
        console.log("REQUEST RequestExplainer intentCheck -- slot.query.value ", slot.query.value)
        delete slot.query.value;
        delete this.attributes.SUGGESTION;
        delete this.attributes.requestingExplainer;
        delete intentObj.confirmationStatus

        return this.emitWithState(intentCheck);
      }
      this.attributes.SUGGESTION = slot.query.value;
    } else if (slot.topic && slot.topic.value) {
      this.attributes.SUGGESTION = slot.topic.value;
    }
    if (this.attributes.SUGGESTION && util.expletiveCheck(this.attributes.SUGGESTION)) {
        let expletive = `<say-as interpret-as="expletive">${this.attributes.SUGGESTION}</say-as>`;
        message += `Come on. You think we're allowed to say ${expletive} on public radio? You gotta be kidding. What would you like an explainer on that we can actually use?`;
        let cardMessage = `Come on. You think we're allowed to say THAT on public radio? You gotta be kidding. Try something we can actually say.`;
        if (slot && slot.query && slot.query.value) {
          delete slot.query.value;
          delete this.attributes.SUGGESTION;
        } else if (slot && slot.topic && slot.topic.value) {
          delete slot.topic.value;
          delete this.attributes.SUGGESTION;
        }
        return this.emit(':elicitSlotWithCard', 'query', message, "What topic would you like to request an explainer on?", 'Request a (clean) Explainer', cardMessage, this.event.request.intent, util.cardImage(config.icon.full));
    }

    if (this.attributes.SUGGESTION && !this.attributes.NAME_REQUESTED && !this.attributes.LOCATION_REQUESTED) {
      var chosenExplainer = util.itemPicker({query: {value: this.attributes.SUGGESTION}}, util.liveExplainers(), 'title', 'topic', false);
      if (chosenExplainer) {
        message += `Actually, we've got you covered there. `
        var newWord = this.attributes.SUGGESTION;
        delete this.attributes.SUGGESTION;
        delete this.attributes.requestingExplainer;
        delete intentObj.confirmationStatus;
        this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
        return util.sendProgressive(
          this.event.context.System.apiEndpoint, // no need to add directives params
          this.event.request.requestId,
          this.event.context.System.apiAccessToken,
          message,
          function (err) {
            boundThis.emitWithState('PickItem', {query: {value: newWord}})
          }
        );
      }
    }


    if (!this.attributes.SUGGESTION) { // came here without a query
      if (this.event.session.new) {
        message += "Welcome back to Make Me Smart! I'm glad you've got an idea to submit! ";
      } else if (this.attributes.REQUESTS === 0 || this.attributes.REQUESTS % 3 === 0) {
        message += 'Some of our best ideas come from you - our Alexa users - so thanks! ';
      }
      message += 'What topic do you think Kai and Molly should do an explainer on?';
      return this.emit(':elicitSlotWithCard', 'query', message, "What topic would you like to request an explainer on?", 'Request Explainer', util.clearProsody(message), this.event.request.intent, util.cardImage(config.icon.full));
    } else if (!this.attributes.NAME_REQUESTED && !this.attributes.LOCATION_REQUESTED && intentObj.confirmationStatus && intentObj.confirmationStatus === 'DENIED') {
      // if denied, clear and ask again
      delete intentObj.confirmationStatus;
      delete this.attributes.SUGGESTION;
      message += "Sorry, my hearing isn't perfect. Let's try again. What topic would you like to suggest?";
      return this.emit(':elicitSlotWithCard', 'query', message, "What topic would you like to request an explainer on?", 'Request Explainer', util.clearProsody(message), this.event.request.intent, util.cardImage(config.icon.full));
    } else if (!this.attributes.NAME_REQUESTED && !this.attributes.LOCATION_REQUESTED && intentObj.confirmationStatus && intentObj.confirmationStatus !== 'CONFIRMED') {
      // if NOT denied, and NOT confirmed, ask for confirmation

      message += `I heard ${this.attributes.SUGGESTION}. Is that right?`
      var confirmMessage = `Do you want to request an explainer on ${this.attributes.SUGGESTION}?`;

      return this.emit(':confirmIntentWithCard', message, confirmMessage, 'Confirm topic', message);
    }

    // if there is a suggestion, and no conf, ask them if it's correct

    if (this.attributes.SUGGESTION && this.attributes.userName && this.attributes.userLocation) { //1
      console.log("REQUEST PickItem using saved name/location", slot)
      this.attributes.REQUESTS++;
      payload.requests = [{
        query: this.attributes.SUGGESTION,
        time: this.event.request.timestamp,
        user: this.attributes.userName,
        location: this.attributes.userLocation
      }];
      let userAsk = '';
      if (this.attributes.REQUESTS > 3 && !this.attributes.SOLICITED) {
        this.attributes.SOLICITED = true;
        userAsk = `And hey, if you'd like to do us a favor, ${config.reviewSolicitation}`;
      } else if (this.attributes.REQUESTS % 4 === 0) {
        userAsk = config.podcastPlug;
      }
      // console.log(this.attributes.REQUESTS, userAsk);
      console.time('DB-request-saved');
      delete this.attributes.requestingExplainer;
      delete intentObj.confirmationStatus
      delete this.attributes.SUGGESTION;
      if (slot && slot.query && slot.query.value) {
        delete slot.query.value
      } else if (slot && slot.topic && slot.topic.value) {
        delete slot.topic.value
      }
      db.update.call(this, payload, function(err, response) {
        console.timeEnd('DB-request-saved');

        message = `Great! I'll tell Kai and Molly you want to get smart about that! ${userAsk} `;
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
    } else if ((!this.attributes.userName) && slot.manualName && !slot.manualName.value) { // 2 no userName
      // solicit manualName
      console.log('Gotta get userName');
      message += `Okay, I'll ask Kai and Molly to look into ${this.attributes.SUGGESTION}. They'll want to thank you if they use your idea, so what's your first name?`;
      this.attributes.NAME_REQUESTED = true;
      return this.emit(':elicitSlotWithCard', 'manualName', message, "What first name should I leave?", 'Tell us your name',message, this.event.request.intent, util.cardImage(config.icon.full));

    } else if ((!this.attributes.userName) && slot.manualName && slot.manualName.value && this.attributes.NAME_REQUESTED) { // 3 got manualName
      // got manual name, save, and request location
      // make checks
      let intentCheck = util.intentCheck(slot.manualName.value);
      let expletiveCheck = util.expletiveCheck(slot.manualName.value);
      if (intentCheck) { // intentCheck redirect
        console.log("REQUEST RequestExplainer intentCheck -- slot.manualName.value ", slot.manualName.value)
        delete slot.manualName.value;
        delete this.attributes.SUGGESTION;
        delete this.attributes.requestingExplainer;
        delete intentObj.confirmationStatus;
        return this.emitWithState(intentCheck);
      } else if (expletiveCheck) { // expletiveCheck redirect
        console.log(`CAUGHT PROFANITY ON slot.manualName.value -- ${slot.manualName.value}`);
        let expletive = `<say-as interpret-as="expletive">${slot.manualName.value}</say-as>`;
        message += `Your name is ${expletive}? That's rough. And something we can't repeat. Do you have a nickname that isn't a dirty word?`;
        let cardMessage = `I must have misheard your name, because that sounded like profanity. Do you have a nickname that isn't a dirty word?`;
        delete slot.manualName.value
        return this.emit(':elicitSlotWithCard', 'manualName', message, "What first name should I leave?", 'Leave a (clean) First Name', cardMessage, this.event.request.intent, util.cardImage(config.icon.full));
      }
      console.log("OK, got manualName ", slot.manualName, " now  REQUEST manualLOCATION");
      this.attributes.userName = slot.manualName.value;
      delete this.attributes.NAME_REQUESTED;
      this.attributes.LOCATION_REQUESTED = true;
      var cardMessage = `Okay, I'll note that you requested an explainer! `;
      message += 'And what city or state are you from?';
      cardMessage += message;

      return this.emit(':elicitSlotWithCard', 'manualLocation', message, "What city or state should I leave?", 'Where are you from?', cardMessage, this.event.request.intent, util.cardImage(config.icon.full));
    } else if ((!this.attributes.userLocation) && slot.manualLocation && !slot.manualLocation.value) { // 4 no manualLocation
      console.log("SOMEHOW HAVE no manualLocation");
      this.attributes.LOCATION_REQUESTED = true;
      var cardMessage = `Okay, I'll note that you requested an explainer! `;
      message += 'And what city or state are you from?';
      cardMessage += message;

      return this.emit(':elicitSlotWithCard', 'manualLocation', message, "What city or state should I leave?", 'Where are you from?', cardMessage, this.event.request.intent, util.cardImage(config.icon.full));

    } else if ((!this.attributes.userLocation) && slot.manualLocation && slot.manualLocation.value) { // 5 got manualName
      console.log("OK, got manualLocation ", slot.manualLocation, " WE SHOULD BE GOOD TO GO");
      // make checks
      let intentCheck = util.intentCheck(slot.manualLocation.value);
      let expletiveCheck = util.expletiveCheck(slot.manualLocation.value);
      if (intentCheck) { // intentCheck redirect
        console.log("REQUEST RequestExplainer intentCheck -- slot.manualLocation.value ", slot.manualLocation.value)
        delete slot.manualLocation.value;
        delete this.attributes.SUGGESTION;
        delete this.attributes.requestingExplainer;
        delete intentObj.confirmationStatus
        return this.emitWithState(intentCheck);
      } else if (expletiveCheck) { // expletiveCheck redirect
        console.log(`CAUGHT PROFANITY ON slot.manualLocation.value -- ${slot.manualLocation.value}`);
        let expletive = `<say-as interpret-as="expletive">${slot.manualLocation.value}</say-as>`;
        message += `You're from ${expletive}? What was your childhood like? Also, can you leave a city without profanity in it?`;
        let cardMessage = `I must have misheard your location, because that sounded like profanity. Ever lived in a town that isn't a dirty word?`;
        delete slot.manualLocation.value;
        return this.emit(':elicitSlotWithCard', 'manualLocation', message, "What city should I leave?", 'Leave a (clean) City', cardMessage, this.event.request.intent, util.cardImage(config.icon.full));
    }
      this.attributes.userLocation = slot.manualLocation.value;
      this.attributes.REQUESTS++;
      payload.requests = [{
        query: this.attributes.SUGGESTION,
        time: this.event.request.timestamp,
        user: this.attributes.userName,
        location: this.attributes.userLocation
      }];
      if (slot.manualName && slot.manualName.value) {
        delete slot.manualName.value;
      }
      delete slot.manualLocation.value;
      delete this.attributes.requestingExplainer;
      delete intentObj.confirmationStatus
      if (slot && slot.query && slot.query.value) {
        delete slot.query.value
      } else if (slot && slot.topic && slot.topic.value) {
        delete slot.topic.value
      }
      console.time('DB-request-manual-location');
      db.update.call(this, payload, function(err, response) {
        console.timeEnd('DB-request-manual-location');

        var confirmationMessage = `Okay, I'll tell Kai and Molly that you asked for an explainer on ${this.attributes.SUGGESTION}. `;
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
        delete this.attributes.SUGGESTION;
        delete this.attributes.LOCATION_REQUESTED;
        delete this.attributes.NAME_REQUESTED;
        delete intentObj.confirmationStatus;
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
      // Got manual location. SAVE and you're good to go
    } else { // god help us how did we get here?
      console.log('REQUEST RequestExplainer at  GENERAL ELSE AHHH:', JSON.stringify(this.event.request, null, 2))
      return this.emitWithState('Unhandled');
    }
  },
  'PickItem': function () {
    // I don't have to worry about coming from a pickItem, because this will always be aclean intent. (I THINK)
    //TODO confirm this ???
    console.log("REQUEST PickItem", JSON.stringify(this.event.request.intent, null,2));
    if (this.attributes.requestingExplainer) {
      delete this.attributes.requestingExplainer;
    }
    this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
    this.emitWithState('PickItem');

  },
  'ListExplainers': function () {
    /*
      if the flag is set, redirect to RequestExplainer intent

      if no flag, change state, emit to the correct intent
    */
    console.log("REQUEST ListExplainers --> ", JSON.stringify(this.event.request, null,2))
    if (this.attributes.requestingExplainer) {
      console.log("REQUEST -- ARTIFACT -- ListExplainers, sending back")
      this.emitWithState('RequestExplainer');
    } else {
      this.handler.state = this.attributes.STATE = config.states.ITERATING_EXPLAINER;
      this.emitWithState('ListExplainers');
    }

  },
  'HomePage' : function () {
    console.log("REQUEST HomePage");
    if (this.attributes.requestingExplainer) {
      console.log("REQUEST -- ARTIFACT -- HomePage, sending back")
      this.emitWithState('RequestExplainer');
    } else {
      this.handler.state = this.attributes.STATE = config.states.HOME_PAGE;
      this.emitWithState('HomePage');
    }
  },

  'PlayLatestExplainer': function () {
    console.log('REQUEST PlayLatestExplainer');
    if (this.attributes.requestingExplainer) {
      console.log("REQUEST -- ARTIFACT -- PlayLatestExplainer, sending back")
      this.emitWithState('RequestExplainer');
    } else {
      this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
      this.emitWithState('PickItem', {index: {value: 1}}, 'REQUEST_LATEST');
    }

    this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
  },
  'ReplayExplainer': function () {
    var slot = slot || this.event.request.intent.slots;

    console.log('REQUEST ReplayExplainer');
    if (this.attributes.requestingExplainer) {
      console.log("REQUEST -- ARTIFACT -- ReplayExplainer, sending back")
      this.emitWithState('RequestExplainer');
    } else {
      this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
      this.emitWithState('PickItem', slot, 'REPLAY_FROM_REQUEST');
    }
  },

  'ChangeMyInfo': function () {
    console.log("REQUEST ChangeMyInfo");
    if (this.attributes.requestingExplainer) {
      console.log("REQUEST -- ARTIFACT -- ChangeMyInfo, sending back")
      this.emitWithState('RequestExplainer');
    } else {
      this.handler.state = this.attributes.STATE = config.states.CHANGE_INFO;
      this.emitWithState('ChangeMyInfo');
    }  },

  // BUILT IN

  'AMAZON.StopIntent' : function() {
    console.log('built in STOP, request')
    // This needs to work for not playing as well
    delete this.attributes.requestingExplainer;
    delete this.attributes.SUGGESTION;
    delete this.attributes.STATE;
    this.response.speak(config.stopMessage)
    this.emit(':saveState');
  },
  'AMAZON.CancelIntent' : function() {
    console.log('CANCEL REQUEST STATE');
    // means they don't wnt to leave it.
    delete this.attributes.requestingExplainer;
    delete this.attributes.SUGGESTION;
    delete this.attributes.STATE;
    this.response.speak(config.cancelMessage);
    this.emit(':saveState');

  },
  'AMAZON.HelpIntent' : function () {
    console.log("HELP INT: ", this.attributes.userId);
    let NAME_TESTING = Object.keys(config.testIds).indexOf(this.attributes.userId) > -1;
    if (NAME_TESTING) {
      console.log("DELETEING name and location and req flags");
      delete this.attributes.SUGGESTION;
      delete this.attributes.userName;
      delete this.attributes.userLocation;
      delete this.attributes.NAME_REQUESTED;
      delete this.attributes.LOCATION_REQUESTED;

    }

    console.log('Help in REQUEST')
    var message = "You can submit an idea for an explainer, say change your info to correct your name or location, or hear what's new. Which would you like to do?";
    this.response.speak(message).listen(message);
    if (this.event.context.System.device.supportedInterfaces.Display) {
      this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Help', message, null, config.background.show));
    }
    // JUST FOR TESTING:

    this.emit(':saveState', true);
  },
  'SessionEndedRequest' : function () {
    // HANDLE FAILURE basically
    console.log("REQUEST session END with", this.attributes.SUGGESTION);
    console.log("SESSION ENDED IN REQUEST", JSON.stringify(this.event, null,2))
    delete this.attributes.SUGGESTION;
    delete this.attributes.STATE;
    this.emit(':saveState', true);

   },
   'Unhandled' : function () {
     console.log("UNHANDLED REQUEST", JSON.stringify(this.event, null,2))

     // Just go to start
     var message = "Sorry I couldn't quite understand that. ";
     var prompt = "You can submit an idea for an explainer, change your info to correct your name or location, or hear what's new. Which would you like to do?";
     this.response.speak(message + prompt).listen(prompt);
     if (this.event.context.System.device.supportedInterfaces.Display) {
       this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Help', message + prompt, null, config.background.show));
     }
     this.emit(':saveState', true);
   }

});
