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
    let confirmMessage;
    let payload = {}
    let intentObj = this.event.request.intent;
    var boundThis = this;

    console.log(`UNRESOLVED PickItem - intentname ${this.event.request.intent.name}... `, JSON.stringify(this.event.request.intent, null, 2));
    console.log("is there an UNRESOLVED IN state?: ", this.attributes.UNRESOLVED);
    let unresolved;

    if (slot.query && slot.query.value) { // query or topic could be
      let intentCheck = util.intentCheck(slot.query.value);
      if (intentCheck) {
        console.log("UNRESOLVED intentCheck -- slot.query.value ", slot.query.value)
        delete slot.query.value;
        return this.emitWithState(intentCheck);
      }
      // do a clean
      unresolved = util.stripActions(slot.query.value);
      delete slot.query.value
    } else if (slot.topic && slot.topic.value) {
      unresolved = util.stripActions(slot.topic.value);
      delete slot.topic.value
    }
    if (unresolved) {
      console.log("EXPLETIVE CHECK ", unresolved)
      if (util.expletiveCheck(unresolved)) {
        if (this.event.session.new) {
          message = 'Welcome to Make Me Smart! ';
        }

        message += `Come on. You think we're allowed to say <say-as interpret-as="expletive">${unresolved}</say-as> on public radio? Let's try that again. `;

        delete intentObj.confirmationStatus;
        this.handler.state = this.attributes.STATE = config.states.ITERATING_EXPLAINER;
        return util.sendProgressive(
          this.event.context.System.apiEndpoint, // no need to add directives params
          this.event.request.requestId,
          this.event.context.System.apiAccessToken,
          message,
          function (err) {
            if (err) {
              console.log("FAILED PROGRESSIVE");
              boundThis.emitWithState('ListExplainers', 'unresolved_expletive', "I couldn't have heard what I thought I heard. ");
            } else {
              boundThis.emitWithState('ListExplainers', 'unresolved_expletive');
            }
          }
        );
      }
      this.attributes.UNRESOLVED = unresolved;
    }
    console.log(`shallow unresolved ${unresolved} deep UNRESOLVED: ${this.attributes.UNRESOLVED} and confirmed? ${intentObj.confirmationStatus}. `);
    // if denied
    if (intentObj.confirmationStatus === 'DENIED') { // denied
      console.log("UNRESOLVED PickItem -- DENIED", JSON.stringify(intentObj, null,2));
      message = "Alright, let's try again. ";
      delete this.attributes.UNRESOLVED;
      delete intentObj.confirmationStatus;
      this.handler.state = this.attributes.STATE = config.states.ITERATING_EXPLAINER;
      return this.emitWithState('ListExplainers', 'unresolved_decline', message);
    }
    if (intentObj.confirmationStatus !== 'CONFIRMED' && unresolved) {
      if (this.event.session.new) {
        message = 'Welcome to Make Me Smart! ';
      } else {
        message = 'Hmmm, ';
      }
      message += `I couldn't find anything on ${this.attributes.UNRESOLVED}. Would you like to request an explainer on that?`;
      confirmMessage = `Would you like to request an explainer on ${this.attributes.UNRESOLVED}?`;
      return this.emit(':confirmIntentWithCard', message, confirmMessage, 'Explainer Not Found', message);

    }

    console.log("UNRESOLVED PickItem -- passed DENIED/CONFIRMED", JSON.stringify(intentObj, null,2));
    if (this.attributes.UNRESOLVED && this.attributes.userName && this.attributes.userLocation) { // 1
      console.log("UNRESOLVED saving saved name/location", slot)
      payload.requests = [{
        query: this.attributes.UNRESOLVED,
        time: this.event.request.timestamp,
        user: this.attributes.userName,
        location: this.attributes.userLocation
      }];
      console.time('DB-unresolved-savedinfo');
      this.attributes.REQUESTS++;

      db.update.call(this, payload, function(err, response) {
        console.timeEnd('DB-unresolved-savedinfo');
        var plug = '';
        if (this.attributes.REQUESTS % 3 === 0) {
          plug += "You can also hear more from Kai and Molly on the podcast version of Make Me Smart, available everywhere!"
        }
        message = `Okay, I'll tell Kai and Molly that you want to get smart about ${this.attributes.UNRESOLVED}! ${plug} " `;
        if (slot.query && slot.query.value) {
          delete slot.query.value;
        }
        delete this.attributes.UNRESOLVED;
        delete intentObj.confirmationStatus;

        this.handler.state = this.attributes.STATE = config.states.ITERATING_EXPLAINER;
        return util.sendProgressive(
          this.event.context.System.apiEndpoint, // no need to add directives params
          this.event.request.requestId,
          this.event.context.System.apiAccessToken,
          message,
          function (err) {
            if (err) {
              boundThis.emitWithState('ListExplainers', 'unresolved_save', message);
            } else {
              boundThis.emitWithState('ListExplainers', 'unresolved_save');
            }
          }
        );
      });
    } else if ((!this.attributes.userName) && slot.userName && !slot.userName.value && !this.attributes.NAME_REQUESTED) { //2
      console.log('HAVENT ASKED FOR USERAME, Gotta get it');
      this.attributes.NAME_REQUESTED = true;
      message += `Okay, I'll ask Kai and Molly to look into ${this.attributes.UNRESOLVED}. They'll want to thank you if they use your idea, so what's your first name?`;
      this.emit(':elicitSlotWithCard', 'userName', message, "What first name should I leave?", 'Request Explainer',message, this.event.request.intent, util.cardImage(config.icon.full));
    } else if ((!this.attributes.userName) && slot.userName && slot.userName.value && this.attributes.NAME_REQUESTED) { // 3
      // GOT NORMAL NAME: request normal location
      let intentCheck = util.intentCheck(slot.userName.value);
      let expletiveCheck = util.expletiveCheck(slot.userName.value);
      if (intentCheck) { // intentCheck redirect
        console.log("UNRESOLVED PickItem intentCheck -- slot.userName.value ", slot.userName.value)
        delete slot.userName.value;
        delete this.attributes.UNRESOLVED;
        delete intentObj.confirmationStatus;

        return this.emitWithState(intentCheck);
      } else if (expletiveCheck) { // expletiveCheck redirect
        console.log(`CAUGHT PROFANITY ON slot.userName.value -- ${slot.userName.value}`);
        let expletive = `<say-as interpret-as="expletive">${slot.userName.value}</say-as>`;
        message += `Your name is ${expletive}? That's rough. And something we can't repeat. Do you have a nickname that isn't a dirty word?`;
        let cardMessage = `I must have misheard your name, because that sounded like profanity. Do you have a nickname that isn't a dirty word?`;
        delete slot.userName.value;
        return this.emit(':elicitSlotWithCard', 'userName', message, "What first name should I leave?", 'Leave a (clean) First Name', cardMessage, this.event.request.intent, util.cardImage(config.icon.full));
      }

      console.log("GOT clean normal name," , slot.userName.value, 'asking for normallocation')
      this.attributes.userName = slot.userName.value;
      delete this.attributes.NAME_REQUESTED;
      this.attributes.LOCATION_REQUESTED = true;
      var cardMessage = `Okay, I'll note that ${this.attributes.userName} would like an explainer on ${this.attributes.UNRESOLVED}. `;
      message += 'And what city or state are you from?';
      cardMessage += message;
      return this.emit(':elicitSlotWithCard', 'userLocation', message, "What city or state should I leave?", 'Request Explainer', cardMessage, this.event.request.intent, util.cardImage(config.icon.full));
    } else if ((!this.attributes.userName) && slot.userName && !slot.userName.value && this.attributes.NAME_REQUESTED && slot.manualName && !slot.manualName.value) { // 4
      // no normal name, but I have requested, and don't have manual, so gotta request
      console.log('asked for userName, didnt get it,  gotta get MANUAL NAME');
      // request manual name
      message += `Seems like I've had trouble understanding your name. Kai and Molly will want to thank you, so what's your first name?`;
      return this.emit(':elicitSlotWithCard', 'manualName', message, "What first name should I leave?", 'Tell us your name',message, this.event.request.intent, util.cardImage(config.icon.full));

    } else if ((!this.attributes.userName) && slot.manualName && slot.manualName.value && this.attributes.NAME_REQUESTED) { // 5
      // GOT MANUAL NAME, save, and request location
      // make checks
      let intentCheck = util.intentCheck(slot.manualName.value);
      let expletiveCheck = util.expletiveCheck(slot.manualName.value);
      if (intentCheck) { // intentCheck redirect
        console.log("UNRESOLVED PickItem intentCheck -- slot.manualName.value ", slot.manualName.value)
        delete slot.manualName.value;
        delete this.attributes.UNRESOLVED;
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
      console.log("OK, got clean manualName ", slot.manualName, " now  REQUEST normal LOCATION");
      this.attributes.userName = slot.manualName.value;
      delete this.attributes.NAME_REQUESTED;
      this.attributes.LOCATION_REQUESTED = true;
      var cardMessage = `Okay, I'll note that ${this.attributes.userName} would like an explainer on ${this.attributes.UNRESOLVED}. `;
      message += 'And what city or state are you from?';
      cardMessage += message;

      return this.emit(':elicitSlotWithCard', 'userLocation', message, "What city or state should I leave?", 'Request Explainer', cardMessage, this.event.request.intent, util.cardImage(config.icon.full));
    } else if ((!this.attributes.userLocation) && slot.userLocation && slot.userLocation.value) { // 6
      // GOT NORMAL LOCATION, good to go.
      console.log("GOT  normal userLocation  ", slot.userLocation.value, "SHOULD BE READY TO SAVE");
      let intentCheck = util.intentCheck(slot.userLocation.value);
      let expletiveCheck = util.expletiveCheck(slot.userLocation.value);
      if (intentCheck) { // intentCheck redirect
        console.log("UNRESOLVED PickItem intentCheck -- slot.userLocation.value ", slot.userLocation.value)
        delete slot.userLocation.value;
        delete this.attributes.UNRESOLVED;
        delete intentObj.confirmationStatus;

        return this.emitWithState(intentCheck);
      } else if (expletiveCheck) { // expletiveCheck redirect
        console.log(`CAUGHT PROFANITY ON slot.userLocation.value -- ${slot.userLocation.value}`);
        let expletive = `<say-as interpret-as="expletive">${slot.userLocation.value}</say-as>`;
        message += `You're from ${expletive}? What was your childhood like? Also, can you leave a city without profanity in it?`;
        let cardMessage = `I must have misheard your location, because that sounded like profanity. Ever lived in a town that isn't a dirty word?`;
        delete slot.userLocation.value;
        return this.emit(':elicitSlotWithCard', 'userLocation', message, "What city should I leave?", 'Leave a (clean) City', cardMessage, this.event.request.intent, util.cardImage(config.icon.full));
      }
      this.attributes.userLocation = slot.userLocation.value;
      this.attributes.REQUESTS++;
      payload.requests = [{
        query: this.attributes.UNRESOLVED,
        time: this.event.request.timestamp,
        user: this.attributes.userName,
        location: this.attributes.userLocation
      }];
      if (slot.userName && slot.userName.value) {
        delete slot.userName.value;
      }
      if (slot.manualName && slot.manualName.value) {
        delete slot.manualName.value;
      }
      delete slot.userLocation.value;

      if (slot && slot.query && slot.query.value) {
        delete slot.query.value
      } else if (slot && slot.topic && slot.topic.value) {
        delete slot.topic.value
      }
      console.time('DB-unresolved-normal-location');
      db.update.call(this, payload, function(err, response) {
        console.timeEnd('DB-unresolved-normal-location');
        var confirmationMessage = `Okay, I'll tell Kai and Molly ${this.attributes.userName} from ${this.attributes.userLocation} asked for an explainer on ${this.attributes.UNRESOLVED}. If you want to change your name or city in the future you can say 'change my info'. `;

        delete this.attributes.NAME_REQUESTED
        delete this.attributes.LOCATION_REQUESTED;
        delete this.attributes.UNRESOLVED;
        delete intentObj.confirmationStatus;

        this.handler.state = this.attributes.STATE = config.states.ITERATING_EXPLAINER;
        return util.sendProgressive(
          this.event.context.System.apiEndpoint, // no need to add directives params
          this.event.request.requestId,
          this.event.context.System.apiAccessToken,
          confirmationMessage,
          function (err) {
            if (err) {
              boundThis.emitWithState('ListExplainers', 'unresolved_save', confirmationMessage);
            } else {
              boundThis.emitWithState('ListExplainers', 'unresolved_save');
            }
          }
        );
      });
    } else if ((!this.attributes.userLocation) && slot.userLocation && !slot.userLocation.value && !this.attributes.LOCATION_REQUESTED) { // 7
      // somehow got here with no userLocation and haven't requested it eliciting location? SAFETY
      this.attributes.LOCATION_REQUESTED = true;
      var cardMessage = `Seems like I'm having trouble understanding your city. Let's try again. What city are you from?`;
      return this.emit(':elicitSlotWithCard', 'manualLocation', cardMessage, "What city or state should I leave?", 'Request Explainer', cardMessage, this.event.request.intent, util.cardImage(config.icon.full));

    } else if ((!this.attributes.userLocation) && slot.userLocation && !slot.userLocation.value && this.attributes.LOCATION_REQUESTED && slot.manualLocation && !slot.manualLocation.value) { // 8
      // no userLocation and I have requested it: gotta get manual
      console.log('asked for userLocation, didnt get it,  gotta get manualLocation');
      var cardMessage = `Seems like I'm having trouble understanding your city. Let's try again. What city are you from?`;
      cardMessage += message;
      return this.emit(':elicitSlotWithCard', 'manualLocation', cardMessage, "What city or state should I leave?", "Where are you from?", cardMessage, this.event.request.intent, util.cardImage(config.icon.full));
    } else if ((!this.attributes.userLocation) && slot.userLocation && !slot.userLocation.value && slot.manualLocation && slot.manualLocation.value) { // 9
      // GOT the location via MANUAL
      console.log("OK, got manualLocation ", slot.manualLocation, " WE SHOULD BE GOOD TO GO");
      // make checks
      let intentCheck = util.intentCheck(slot.manualLocation.value);
      let expletiveCheck = util.expletiveCheck(slot.manualLocation.value);
      if (intentCheck) { // intentCheck redirect
        console.log("UNRESOLVED PickItem intentCheck -- slot.manualLocation.value ", slot.manualLocation.value)
        delete slot.manualLocation.value;
        delete this.attributes.UNRESOLVED;
        delete intentObj.confirmationStatus;

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
        query: this.attributes.UNRESOLVED,
        time: this.event.request.timestamp,
        user: this.attributes.userName,
        location: this.attributes.userLocation
      }];
      if (slot.userName && slot.userName.value) {
        delete slot.userName.value;
      }
      if (slot.manualName && slot.manualName.value) {
        delete slot.manualName.value;
      }
      delete slot.manualLocation.value;

      if (slot && slot.query && slot.query.value) {
        delete slot.query.value
      } else if (slot && slot.topic && slot.topic.value) {
        delete slot.topic.value
      }
      console.time('DB-unresolved-manual-location');
      db.update.call(this, payload, function(err, response) {
        console.timeEnd('DB-unresolved-manual-location');

        var confirmationMessage = `Okay, I'll tell Kai and Molly ${this.attributes.userName} from ${this.attributes.userLocation} asked for an explainer on ${this.attributes.UNRESOLVED}. If you want to change your name or city in the future you can say 'change my info'. `;

        delete this.attributes.UNRESOLVED;
        delete intentObj.confirmationStatus;

        delete this.attributes.LOCATION_REQUESTED;
        delete this.attributes.NAME_REQUESTED
        this.handler.state = this.attributes.STATE = config.states.ITERATING_EXPLAINER;

        return util.sendProgressive(
          this.event.context.System.apiEndpoint, // no need to add directives params
          this.event.request.requestId,
          this.event.context.System.apiAccessToken,
          confirmationMessage,
          function (err) {
            if (err) {
              boundThis.emitWithState('ListExplainers', 'unresolved_save', confirmationMessage);
            } else {
              boundThis.emitWithState('ListExplainers', 'unresolved_save');
            }
          }
        );
      });
// HERE
    } else { //IS  CONFIRMED, don't have userName/userLocation HOW DID WE GET HERE?
      console.log('UNRESOLVED PickItem at the no slot GENERAL ELSE:', JSON.stringify(this.event.request, null, 2))
      return this.emitWithState('Unhandled');
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

  'AMAZON.StopIntent' : function() {
    console.log('UNRESOLVED StopIntent')
    // This needs to work for not playing as well
    delete this.attributes.UNRESOLVED;
    delete this.attributes.STATE;
    this.response.speak(config.stopMessage)

    this.emit(':saveState');


  },
  'AMAZON.CancelIntent' : function() {
    console.log('UNRESOLVED CancelIntent');
    // means they don't wnt to leave it.
    delete this.attributes.STATE;
    delete this.attributes.UNRESOLVED;
    this.response.speak(config.cancelMessage);

    this.emit(':saveState');

  },
  'AMAZON.HelpIntent' : function () {
    console.log('UNRESOLVED HelpIntent')
    var message = "You can hear what's new, browse explainers, or submit an idea for an explainer. Which would you like to do?";
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
     var prompt = "You can hear what's new, browse explainers, or submit an idea for an explainer. Which would you like to do?";
     this.response.speak(message + prompt).listen(prompt);
     if (this.event.context.System.device.supportedInterfaces.Display) {
       this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Help', message + prompt, null, config.background.show));
     }
     this.emit(':saveState', true);
   }

});
