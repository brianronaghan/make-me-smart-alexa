'use strict';

var Alexa = require('alexa-sdk');

var config = require('../config');
var util = require('../util');

var db = require('../db');

module.exports = Alexa.CreateStateHandler(config.states.REQUEST, {
  'LaunchRequest': function () {
    let NAME_TESTING = Object.keys(config.testIds).indexOf(this.attributes.userId) > -1;

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
    this.attributes.requestingExplainer = true;
    console.log(`REQUEST requestingExplainer - ENTRY intentName ${this.event.request.intent.name}... `, JSON.stringify(this.event.request, null, 2));
    if (slot.query && slot.query.value) {
      let intentCheck = util.intentCheck(slot.query.value);
      if (intentCheck) {
        console.log("REQUEST RequestExplainer intentCheck -- slot.query.value ", slot.query.value)
        delete slot.query.value;
        delete this.attributes.SUGGESTION;
        delete this.attributes.requestingExplainer;
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


    if (!this.attributes.SUGGESTION) { // came here without a query
      if (this.event.session.new) {
        message += "Welcome to Make Me Smart! "
      }
      if (this.attributes.REQUESTS === 0 || this.attributes.REQUESTS % 3 === 0) {
        message += 'Some of our best ideas come from you - our Alexa users - so thanks! ';
      }
      message += 'What topic do you think Kai and Molly should do an explainer on?';
      return this.emit(':elicitSlotWithCard', 'query', message, "What topic would you like to request an explainer on?", 'Request Explainer', util.clearProsody(message), this.event.request.intent, util.cardImage(config.icon.full));
    }

    let upperFirst = this.attributes.SUGGESTION.charAt(0).toUpperCase() + this.attributes.SUGGESTION.slice(1);
    let suggestionString = `${upperFirst}! Great idea!`;
    if (this.attributes.SUGGESTION && this.attributes.userName && this.attributes.userLocation && !NAME_TESTING) {
      console.log("REQUEST PickItem using saved name/location", slot)
      this.attributes.REQUESTS++;
      payload.requests = [{
        query: this.attributes.SUGGESTION,
        time: this.event.request.timestamp,
        user: this.attributes.userName,
        location: this.attributes.userLocation
      }];
      let userAcknowledge;
      if (this.attributes.ANONYMOUS || (this.attributes.REQUESTS > 2 && this.attributes.REQUESTS % 3 !== 0)) {
        userAcknowledge = 'you want'
      } else {
        userAcknowledge = `${this.attributes.userName} from ${this.attributes.userLocation} wants`
      }

      console.time('DB-request-saved');
      delete this.attributes.requestingExplainer;
      delete this.attributes.SUGGESTION;
      if (slot && slot.query && slot.query.value) {
        delete slot.query.value
      } else if (slot && slot.topic && slot.topic.value) {
        delete slot.topic.value
      }
      db.update.call(this, payload, function(err, response) {
        console.timeEnd('DB-request-saved');
        message = `${suggestionString} I'll tell Kai and Molly that ${userAcknowledge} to get smart about that! You can also hear more from Kai and Molly by saying "alexa, play podcast Make Me Smart." `;
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
    } else if ((!this.attributes.userName || NAME_TESTING) && slot.userName && !slot.userName.value && !this.attributes.NAME_REQUESTED) {
      // don't have normal name, haven't requested
      console.log('Gotta get userName');
      message += `${suggestionString} I'll ask Kai and Molly to look into it. They'll want to thank you if they use your idea, so what's your first name?`;
      this.attributes.NAME_REQUESTED = true;
      return this.emit(':elicitSlotWithCard', 'userName', message, "What first name should I leave?", 'Request Explainer',message, this.event.request.intent, util.cardImage(config.icon.full));
    } else if ((!this.attributes.userName || NAME_TESTING) && slot.userName && slot.userName.value && this.attributes.NAME_REQUESTED) {
      // GOT NORMAL NAME: request normal location
      console.log("GOT normal name," , slot.userName.value, 'asking for normallocation')
      this.attributes.userName = slot.userName.value;
      delete this.attributes.NAME_REQUESTED;
      this.attributes.LOCATION_REQUESTED = true;
      var cardMessage = `I'll note that ${this.attributes.userName} would like an explainer on ${this.attributes.SUGGESTION}. `;
      message += 'And what city or state are you from?';
      cardMessage += message;
      return this.emit(':elicitSlotWithCard', 'userLocation', message, "What city or state should I leave?", 'Request Explainer', cardMessage, this.event.request.intent, util.cardImage(config.icon.full));
    } else if ((!this.attributes.userName || NAME_TESTING) && slot.userName && !slot.userName.value && this.attributes.NAME_REQUESTED && slot.manualName && !slot.manualName.value) {
      // don't have normal name, but I HAVE requested it: REQUEST MANUAL
      console.log('asked for userName, didnt get it,  gotta get MANUAL NAME');
      // request manual name
      let thankYou;
      if (this.attributes.SUGGESTION) {
        thankYou = `for suggesting ${this.attributes.SUGGESTION}`
      } else {
        thankYou = 'for your ideas'
      }
      message += `Seems like I had trouble understanding your name. Kai and Molly will want to thank you for ${thankYou}, so what's your first name?`;
      return this.emit(':elicitSlotWithCard', 'manualName', message, "What first name should I leave?", 'Tell us your name',message, this.event.request.intent, util.cardImage(config.icon.full));

    } else if ((!this.attributes.userName || NAME_TESTING) && slot.userName && !slot.userName.value && slot.manualName && slot.manualName.value) {
      // got manual name, save, and request location
      console.log("OK, got manualName ", slot.manualName, " now  REQUEST normal LOCATION");
      this.attributes.userName = slot.manualName.value;
      delete this.attributes.NAME_REQUESTED;
      this.attributes.LOCATION_REQUESTED = true;
      var cardMessage = `Okay, I'll note that ${this.attributes.userName} would like an explainer on ${this.attributes.SUGGESTION}. `;
      message += 'And what city or state are you from?';
      cardMessage += message;

      return this.emit(':elicitSlotWithCard', 'userLocation', message, "What city or state should I leave?", 'Request Explainer', cardMessage, this.event.request.intent, util.cardImage(config.icon.full));

    } else if ((!this.attributes.userLocation || NAME_TESTING) && slot.userLocation && slot.userLocation.value) {
      // got normal location, good to go.
      console.log("GOT  normal userLocation  ", slot.userLocation.value, "SHOULD BE READY TO SAVE");
      this.attributes.userLocation = slot.userLocation.value;
      this.attributes.REQUESTS++;
      payload.requests = [{
        query: this.attributes.SUGGESTION,
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
      delete this.attributes.requestingExplainer;
      if (slot && slot.query && slot.query.value) {
        delete slot.query.value
      } else if (slot && slot.topic && slot.topic.value) {
        delete slot.topic.value
      }
      console.time('DB-request-normal-location');
      db.update.call(this, payload, function(err, response) {
        console.timeEnd('DB-request-normal-location');
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
        delete this.attributes.NAME_REQUESTED
        delete this.attributes.LOCATION_REQUESTED;
        delete this.attributes.SUGGESTION;
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
    } else if ((!this.attributes.userLocation || NAME_TESTING) && slot.userLocation && !slot.userLocation.value && this.attributes.LOCATION_REQUESTED && slot.manualLocation && !slot.manualLocation.value) {
      // no userLocation and I have requested it: gotta get manual
      console.log('asked for userLocation, didnt get it,  gotta get manualLocation');
      var cardMessage = `Seems like I'm having trouble understanding your city. Let's try again. What city are you from?`;
      cardMessage += message;
      return this.emit(':elicitSlotWithCard', 'manualLocation', cardMessage, "What city or state should I leave?", "Where are you from?", cardMessage, this.event.request.intent, util.cardImage(config.icon.full));
    } else if ((!this.attributes.userLocation && !NAME_TESTING) && slot.userLocation && !slot.userLocation.value && slot.manualLocation && slot.manualLocation.value) {
      console.log("OK, got manualLocation ", slot.manualLocation, " WE SHOULD BE GOOD TO GO");
      this.attributes.userLocation = slot.manualLocation.value;
      this.attributes.REQUESTS++;
      payload.requests = [{
        query: this.attributes.SUGGESTION,
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
      delete this.attributes.requestingExplainer;
      if (slot && slot.query && slot.query.value) {
        delete slot.query.value
      } else if (slot && slot.topic && slot.topic.value) {
        delete slot.topic.value
      }
      console.time('DB-request-manual-location');
      db.update.call(this, payload, function(err, response) {
        console.timeEnd('DB-request-manual-location');

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
        delete this.attributes.SUGGESTION;
        delete this.attributes.LOCATION_REQUESTED;
        delete this.attributes.NAME_REQUESTED
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
    } else if (false && slot.userName && slot.userName.value && slot.userLocation && slot.userLocation.value) { // WE have filled in both in the cycle
      // NOTE: I THINK that this should be moot... BASICALLY: to get to the end of the cycle you must have location previously
      // let intentCheck = util.intentCheck(slot.userLocation.value);
      // if (intentCheck) {
      //   console.log("REQUEST RequestExplainer intentCheck -- slot.userLocation.value ", slot.userLocation.value)
      //   delete slot.query.value;
      //   delete slot.userName.value;
      //   delete slot.userLocation.value;
      //   delete this.attributes.requestingExplainer;
      //   return this.emitWithState(intentCheck);
      // }
      //
      // console.log("HAVE userLocation and userName ", slot);
      //
      // this.attributes.userLocation = slot.userLocation.value;
      // payload.requests = [{
      //   query: suggestion,
      //   time: this.event.request.timestamp,
      //   user: this.attributes.userName,
      //   location: this.attributes.userLocation
      // }];
      // delete slot.userName.value;
      // delete slot.userLocation.value;
      // delete this.attributes.requestingExplainer;
      // if (slot && slot.query && slot.query.value) {
      //   delete slot.query.value
      // } else if (slot && slot.topic && slot.topic.value) {
      //   delete slot.topic.value
      // }
      // console.time('DB-request-new-name');
      // db.update.call(this, payload, function(err, response) {
      //   console.timeEnd('DB-request-new-name');
      //   var confirmationMessage = `Okay, I'll tell Kai and Molly ${this.attributes.userName} from ${this.attributes.userLocation} asked for an explainer on ${suggestion}. If you want to change your name or city in the future you can say 'change my info'. `;
      //   if (this.event.context.System.device.supportedInterfaces.Display) {
      //     this.response.renderTemplate(
      //       util.templateBodyTemplate1(
      //         'Request Received!',
      //         confirmationMessage,
      //         '',
      //         config.background.show
      //       )
      //     );
      //   }
      //
      //   this.handler.state = this.attributes.STATE = config.states.HOME_PAGE;
      //   return util.sendProgressive(
      //     this.event.context.System.apiEndpoint, // no need to add directives params
      //     this.event.request.requestId,
      //     this.event.context.System.apiAccessToken,
      //     confirmationMessage,
      //     function (err) {
      //       if (err) {
      //         boundThis.emitWithState('HomePage', 'requested', confirmationMessage);
      //       } else {
      //         boundThis.emitWithState('HomePage', 'requested');
      //       }
      //     }
      //   );
      // });
    } else { // no userLocation or userName slot
      console.log('REQUEST RequestExplainer at the no slot GENERAL ELSE AHHH:', JSON.stringify(this.event.request.intent, null, 2))
    }
  },
  'PickItem': function () {
    // I don't have to worry about coming from a pickItem, because this will always be aclean intent. (I THINK)
    //TODO confirm this ???
    console.log("REQUEST PickItem", JSON.stringify(this.event.request.intent, null,2));
    if (this.attributes.requestingExplainer) {
      delete this.attributes.requestingExplainer
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
    delete this.attributes.SUGGESTION;
    delete this.attributes.STATE;
    this.response.speak('See you later. Say Alexa, Make Me Smart to get learning again.')
    this.emit(':saveState');
  },
  'AMAZON.CancelIntent' : function() {
    console.log('CANCEL REQUEST STATE');
    // means they don't wnt to leave it.
    delete this.attributes.STATE;
    delete this.attributes.requestingExplainer;
    delete this.attributes.SUGGESTION;
    this.response.speak('See you later. Say Alexa, Make Me Smart to get learning again.')
    this.emit(':saveState');

  },
  'AMAZON.HelpIntent' : function () {
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
