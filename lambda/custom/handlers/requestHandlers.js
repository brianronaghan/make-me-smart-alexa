'use strict';

var Alexa = require('alexa-sdk');

var config = require('../config');
var util = require('../util');

var explainers = require('../explainers')
var db = require('../db');

module.exports = Alexa.CreateStateHandler(config.states.REQUEST, {
  'LaunchRequest': function () {
    console.log("REQUEST LAUNCH REQ", this.handler.state)
    if (this.attributes.requestingExplainer) {
      delete this.attributes.requestingExplainer;
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
    this.attributes.requestingExplainer = true;
    console.log(`REQUEST requestingExplainer - ENTRY intentName ${this.event.request.intent.name}... `, JSON.stringify(this.event.request, null, 2));

    if (slot.query && !slot.query.value && !this.attributes.SUGGESTION) { // BEGINNING OF PROCESS
      if (this.event.session.new) {
        message += "Welcome to Make Me Smart! "
      }
      message += `Some of our best ideas come from you - our Alexa users - so thanks! What topic do you think Kai and Molly should do an explainer on?`;
      return this.emit(':elicitSlotWithCard', 'query', message, "What topic would you like to request an explainer on?", 'Request Explainer', util.clearProsody(message), this.event.request.intent, util.cardImage(config.icon.full));
    }
    let suggestion;
    if (slot.query && slot.query.value) {
      let intentCheck = util.intentCheck(slot.query.value);
      if (intentCheck) {
        console.log("REQUEST RequestExplainer has an intent in -- slot.query.value ", slot.query.value)
        delete slot.query.value;
        delete this.attributes.SUGGESTION;
        delete this.attributes.requestingExplainer;
        return this.emitWithState(intentCheck);
      }
      suggestion = slot.query.value;
    } else if (slot.topic && slot.topic.value) {
      suggestion = slot.topic.value;
    }
    if (suggestion) {
      if (util.expletiveCheck(suggestion)) {
        let expletive = `<say-as interpret-as="expletive">${suggestion}</say-as>`;
        message += `Come on. You think we're allowed to say ${expletive} on public radio? You gotta be kidding. What would you like an explainer on that we can actually use?`;
        let cardMessage = `Come on. You think we're allowed to say THAT on public radio? You gotta be kidding. Try something we can actually say.`;
        if (slot && slot.query && slot.query.value) {
          delete slot.query.value
        } else if (slot && slot.topic && slot.topic.value) {
          delete slot.topic.value
        }
        return this.emit(':elicitSlotWithCard', 'query', message, "What topic would you like to request an explainer on?", 'Request a (clean) Explainer', cardMessage, this.event.request.intent, util.cardImage(config.icon.full));

      } else {
        this.attributes.SUGGESTION = suggestion;
      }
    }


    let suggestionString = `${this.attributes.SUGGESTION}! Great idea!`
    if (this.attributes.SUGGESTION && this.attributes.userName && this.attributes.userLocation && (Object.keys(config.testIds).indexOf(this.attributes.userId) < 0)) {
      console.log("REQUEST PickItem using saved name/location", slot)
      payload.requests = [{
        query: this.attributes.SUGGESTION,
        time: this.event.request.timestamp,
        user: this.attributes.userName,
        location: this.attributes.userLocation
      }];
      console.time('DB-request-saved');

      db.update.call(this, payload, function(err, response) {
        console.timeEnd('DB-request-saved');
        message = `${suggestionString} I'll tell Kai and Molly that ${this.attributes.userName} from ${this.attributes.userLocation} wants to get smart about that! You can also hear more from Kai and Molly by saying "alexa, play podcast Make Me Smart." `;
        //
        this.handler.state = this.attributes.STATE = config.states.HOME_PAGE;
        if (slot && slot.query && slot.query.value) {
          delete slot.query.value
        } else if (slot && slot.query && slot.query.value) {
          delete slot.topic.value
        }
        delete this.attributes.requestingExplainer;
        delete this.attributes.SUGGESTION;

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
    } else if (slot.userName && !slot.userName.value && !this.attributes.MANUAL_NAME) {
      console.log('Gotta get userName');
      if (!this.attributes.REQUESTING_NAME) {
        this.attributes.REQUESTING_NAME = true;
        message += `${suggestionString} I'll ask Kai and Molly to look into it. They'll want to thank you if they use your idea, so what's your first name?`;
        this.emit(':elicitSlotWithCard', 'userName', message, "What first name should I leave?", 'First Name Entry',message, this.event.request.intent, util.cardImage(config.icon.full));
      } else {
        console.log("PROBLEM WITH NAME, eh?")
        this.attributes.MANUAL_NAME = true;
        message += `It looks like I'm having trouble understanding your first name. Let's try again. What's your first name?`;
        this.emit(':elicitSlotWithCard', 'manualName', message, "What first name should I leave?", 'First Name Entry - retry',message, this.event.request.intent, util.cardImage(config.icon.full));
      }
    } else if (slot.manualName && slot.manualName.value) {
      // we GOT the name through manual...
      // CHECK FOR INTENT
      let intentCheck = util.intentCheck(slot.manualName.value);
      if (intentCheck) {
        console.log("REQUEST RequestExplainer intentCheck -- slot.manualName.value ", slot.manualName.value)
        delete slot.query.value;
        delete slot.userName.value;
        delete this.attributes.requestingExplainer;
        delete this.attributes.SUGGESTION;
        delete this.attributes.REQUESTING_NAME;
        delete this.attributes.MANUAL_NAME
        return this.emitWithState(intentCheck);
      }
      // HAPPY CASE:
      // SAVE Name
      this.attributes.userName = slot.manualName.value;
      // CLEAR manualName from slot?
      // REMOVE REQUESTING NAME
      delete this.attributes.REQUESTING_NAME;
      // REMOVE MANUAL_NAME
      delete this.attributes.MANUAL_NAME
      // SET REQUESTING_LOCATION
      this.attributes.REQUESTING_LOCATION = true;
      // NORMAL elicit userLocation ( I think)
      var cardMessage = `I'll note that ${this.attributes.userName} would like an explainer on ${this.attributes.SUGGESTION}. `;
      message += 'And what city or state are you from?';
      cardMessage += message;
      return this.emit(':elicitSlotWithCard', 'userLocation', message, "What city or state should I leave?", 'Request Explainer', cardMessage, this.event.request.intent, util.cardImage(config.icon.full));

    } else if (slot.userLocation && !slot.userLocation.value && !this.attributes.MANUAL_LOCATION) {

      // CHECK FOR INTENT
      let intentCheck = util.intentCheck(slot.userName.value);
      if (intentCheck) {
        console.log("REQUEST RequestExplainer intentCheck -- slot.userName.value ", slot.userName.value)
        delete slot.query.value;
        delete slot.userName.value;
        delete this.attributes.requestingExplainer;
        delete this.attributes.SUGGESTION;

        return this.emitWithState(intentCheck);
      }


      // if !this.attributes.REQUESTING_LOCATION -> first time here, haven't been asked

        // SAVE slot.userName or slot.manualName i guess
        // REMOVE REQUESTING NAME
        // REMOVE MANUAL_NAME
        // NORMAL elicit userLocation ( I think)
      // else (REQUESTING_LOCATION) -> asked (EITHER BY HERE, OR MANUAL NAME) and it didn't work
        // set MANUAL LOCATION
        // elicit manualLocation
      console.log('Gotta get userLocation');
      this.attributes.userName = slot.userName.value;
      var cardMessage = `I'll note that ${slot.userName.value} would like an explainer on ${suggestion}. `;
      message += 'And what city or state are you from?';
      cardMessage += message;
      return this.emit(':elicitSlotWithCard', 'userLocation', message, "What city or state should I leave?", 'Request Explainer', cardMessage, this.event.request.intent, util.cardImage(config.icon.full));
    } else if (slot.manualLocation && slot.manualLocation.value) {
      // we got LOCATION through manual
      // CHECK FOR INTENT
      // HAPPY CASE:
      // SAVE Location
      // CLEAR manualLocation?
      // REMOVE REQUESTING_LOCATION
      // REMOVE MANUAL_LOCATION
      // Now We Can Save!!!!
    } else if (slot.userName && slot.userName.value && slot.userLocation && slot.userLocation.value) { // WE have filled in both in the cycle NOTE: will have to check basically... um attributes as well?
      // TODO: a that first part, that userName is value, is not correct. It could be... could be from userName, or manualName, OR REALLY attrubutes too...
      let intentCheck = util.intentCheck(slot.userLocation.value);
      if (intentCheck) {
        console.log("REQUEST RequestExplainer intentCheck -- slot.userLocation.value ", slot.userLocation.value)
        delete slot.query.value;
        delete slot.userName.value;
        delete slot.userLocation.value;
        delete this.attributes.requestingExplainer;
        delete this.attributes.SUGGESTION;
        return this.emitWithState(intentCheck);
      }

      console.log("HAVE userLocation and userName ", slot);

      this.attributes.userLocation = slot.userLocation.value;
      payload.requests = [{
        query: this.attributes.SUGGESTION,
        time: this.event.request.timestamp,
        user: this.attributes.userName,
        location: this.attributes.userLocation
      }];
      delete slot.userName.value;
      delete slot.userLocation.value;
      delete this.attributes.requestingExplainer;
      delete this.attributes.SUGGESTION;

      if (slot && slot.query && slot.query.value) {
        delete slot.query.value
      } else if (slot && slot.topic && slot.topic.value) {
        delete slot.topic.value
      }
      console.time('DB-request-new-name');
      db.update.call(this, payload, function(err, response) {
        console.timeEnd('DB-request-new-name');
        var confirmationMessage = `Okay, I'll tell Kai and Molly ${this.attributes.userName} from ${this.attributes.userLocation} asked for an explainer on ${this.attributes.SUGGESTION}. If you want to change your name or city in the future you can say 'change my info'. `;
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
    } else { // no userLocation or userName slot
      console.log('REQUEST RequestExplainer at the no slot GENERAL ELSE:', JSON.stringify(this.event.request.intent, null, 2))
    }
  },
  'PickItem': function () {
    // I don't have to worry about coming from a pickItem, because this will always be aclean intent. (I THINK)
    //TODO confirm this ???
    console.log("REQUEST PickItem", JSON.stringify(this.event.request.intent, null,2));
    if (this.attributes.requestingExplainer) {
      delete this.attributes.requestingExplainer;
      // delete this.attributes.SUGGESTION;
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
    console.log('REQUEST ReplayExplainer');
    if (this.attributes.requestingExplainer) {
      console.log("REQUEST -- ARTIFACT -- ReplayExplainer, sending back")
      this.emitWithState('RequestExplainer');
    } else {
      this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
      this.emitWithState('PickItem', 'REPLAY_FROM_REQUEST');
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
    delete this.attributes.requestingExplainer;

    this.response.speak('See you later. Say Alexa, Make Me Smart to get learning again.')
    this.emit(':saveState');

    // this.handler.state = this.attributes.STATE = config.states.HOME_PAGE;
    // this.emitWithState('HomePage', 'no_welcome', "Got it, I won't put in that request.");
  },
  'AMAZON.HelpIntent' : function () {
    console.log('Help in REQUEST')
    var message = "You can submit an idea for an explainer, say change your info to correct your name or location, or hear what's new. Which would you like to do?";
    this.response.speak(message).listen(message);
    if (this.event.context.System.device.supportedInterfaces.Display) {
      this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Help', message, null, config.background.show));
    }
    this.emit(':saveState', true);
  },
  'SessionEndedRequest' : function () {
    // HANDLE FAILURE basically
    console.log("SESSION ENDED IN REQUEST", JSON.stringify(this.event, null,2))
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
