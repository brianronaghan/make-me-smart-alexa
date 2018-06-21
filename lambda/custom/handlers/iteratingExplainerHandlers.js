var Alexa = require('alexa-sdk');

var config = require('../config');
var util = require('../util');

var db = require('../db');

module.exports = Alexa.CreateStateHandler(config.states.ITERATING_EXPLAINER, {
  'LaunchRequest': function () {
    console.log("LR in ITERATING?")
    if (this.attributes.indices && this.attributes.indices.explainer) {
      this.attributes.indices.explainer = 0;
    }
    this.handler.state = this.attributes.STATE = config.states.START;
    this.emitWithState('LaunchRequest');
  },
  IndexOnly: function () {
    console.log("ITERATING_EXPLAINER IndexOnly", JSON.stringify(this.event.request.intent, null,2))
    var slot = slot || this.event.request.intent.slots;
    delete this.attributes.ITERATING;
    this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
    this.emitWithState('PickItem', slot, 'ITERATING');

  },
  OrdinalOnly: function () {
    console.log("ITERATING_EXPLAINER OrdinalOnly", JSON.stringify(this.event.request.intent, null,2))
    var slot = slot || this.event.request.intent.slots;
    delete this.attributes.ITERATING;
    this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
    this.emitWithState('PickItem', slot, 'ITERATING');
  },
  'ListExplainers': function (condition, incomingMessage) {
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    if (this.event.session.new || (!this.attributes.indices.explainer)) { // is this logic correct?
      this.attributes.indices.explainer = 0;
    }
    this.attributes.ITERATING = true;
    var slot = slot || this.event.request.intent.slots;
    console.log("LIST_EXPLAINERS ListExplainer, SLOT", slot, ' and condition ', condition)
    if (slot && slot.query && slot.query.value) {
      console.log('IT EXP, LIST EXP, got a query', slot.query.value);
      let intentCheck = util.intentCheck(slot.query.value);
      let directionCheck = util.directionCheck(slot.query.value);

      if (intentCheck) {
        console.log("ITERATING_EXPLAINER ListExplainers intentCheck -- slot.query.value ", slot.query.value)
        delete slot.query.value;
        delete this.attributes.ITERATING;
        return this.emitWithState(intentCheck);
      } else if (directionCheck) {
        console.log("ITERATING_EXPLAINER ListExplainers caught DIRECTION NAV: ", slot.query.value);
        delete slot.query.value;
        delete this.attributes.ITERATING;
        return this.emitWithState(directionCheck);
      } else {
        console.log("GOT a non-intent query on list explainers, so redirecting to PLAYING_EXPLAINER state")
        delete this.attributes.ITERATING;
        this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
        return this.emitWithState('PickItem', slot, 'ITERATING');
      }
    }

    var data = util.itemLister(
      util.liveExplainers(),
      `explainers`,
      'title',
      this.attributes.indices.explainer,
      config.items_per_prompt.explainer
    );
    let listMessage = '';
    if (incomingMessage) {
      listMessage += incomingMessage;
    }
    if (this.event.session.new) {
      listMessage += "Welcome to Make Me Smart! Let's do a deep dive! ";
    }
    if (condition && condition === 'unresolved_save') {
      listMessage += "In the meantime, I'll list the explainers again: ";
    } else if (condition && condition === 'repeating') {
      listMessage += "Here they are again: "
    } else if (this.attributes.indices.explainer === 0) {
      listMessage += `I'll list all ${util.liveExplainers().length} explainers, ${config.items_per_prompt.explainer} at a time: `;
    }
    listMessage += data.itemsAudio;
    this.emit(':elicitSlotWithCard', 'query', listMessage, "Pick one or say newer or older to move forward or backward through list.", 'List of Explainers', data.itemsCard, this.event.request.intent, util.cardImage(config.icon.full));
  },

  // NAVIGATION

  'OlderExplainers' : function () {
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    let boundThis = this;
    var slot = slot || this.event.request.intent.slots;
    console.log('ITERATING_EXPLAINER - OlderExplainers', JSON.stringify(this.event.request.intent, null,2))

    if (this.attributes.ITERATING) {
      console.log("ITERATING_EXPLAINER -- ARTIFACT -- OlderExplainers, sending back")
      return this.emitWithState('ListExplainers');
    } else {
      // NO ITERATING, which means, um, to actually do it?
      console.log("OlderExplainers, NO ITERATING FLAG, so I guess it's real? ")
      if (this.attributes.indices.explainer + config.items_per_prompt.explainer >= util.liveExplainers().length) {
        let message = "This is the end of the list. Again, the choices are, "
        return util.sendProgressive(
          this.event.context.System.apiEndpoint, // no need to add directives params
          this.event.request.requestId,
          this.event.context.System.apiAccessToken,
          message,
          function (err) {
            if (err) {
              return boundThis.emitWithState('ListExplainers', 'end_list');
            } else {
              return boundThis.emitWithState('ListExplainers', 'end_list');
            }
          }
        );
      } else {
        if (!this.attributes.indices.explainer) {
          this.attributes.indices.explainer = 0;
        }
        this.attributes.indices.explainer += config.items_per_prompt.explainer;
        this.emitWithState('ListExplainers', 'older');
      }
    }
  },

  'NewerExplainers' : function () {
    let boundThis = this;
    console.log("ITERATING_EXPLAINER NewerExplainers", this.event.request);
    var slot = slot || this.event.request.intent.slots;
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);

    if (this.attributes.ITERATING) {
      console.log("ITERATING_EXPLAINER -- ARTIFACT -- NewerExplainers, sending back")
      return this.emitWithState('ListExplainers');
    } else {
      console.log("NewerExplainers, NO ITERATING FLAG, so I guess it's real? ")
      this.attributes.indices.explainer -= config.items_per_prompt.explainer;
      if (this.attributes.indices.explainer < 0) {
        this.attributes.indices.explainer = 0;
        let message = "You've reached the beginning of the list. Again, "
        return util.sendProgressive(
          this.event.context.System.apiEndpoint, // no need to add directives params
          this.event.request.requestId,
          this.event.context.System.apiAccessToken,
          message,
          function (err) {
            if (err) {
              return boundThis.emitWithState('ListExplainers', 'beginning_list');
            } else {
              return boundThis.emitWithState('ListExplainers', 'beginning_list');
            }
          }
        );

      } else {
        this.emitWithState('ListExplainers', 'newer');
      }
    }

  },
  // STATE TRANSITIONS

  'PickItem': function (slot) {
    // TODO: I BELIEVE that this will always be fine, right?
    var slot = slot || this.event.request.intent.slots;
    console.log('ITERATING_EXPLAINER, PickItem -- ',JSON.stringify(this.event.request.intent, null,2));

    if (this.attributes.ITERATING) {
      console.log("ITERATING_EXPLAINER -- ARTIFACT -- PickItem, sending back")
      return this.emitWithState('ListExplainers');
    } else {
      console.log("ITERATING_EXPLAINER -- NO FLAG -- no flag, so real?")
      delete this.attributes.ITERATING;
      this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
      this.emitWithState('PickItem', slot, 'ITERATING');

    }
  },


  'RequestExplainer' : function () {
    console.log('ITERATING_EXPLAINER - RequestExplainer')
    var slot = slot || this.event.request.intent.slots;
    if (this.attributes.ITERATING) {
      console.log("ITERATING_EXPLAINER -- ARTIFACT -- RequestExplainer, sending back")
      return this.emitWithState('ListExplainers');
    } else {
      this.attributes.indices.explainer = 0;
      console.log("ACTUALLY RequestExplainer REDIRECTING", JSON.stringify(this.event.request.intent, null,2))
      this.handler.state = this.attributes.STATE = config.states.REQUEST;
      this.emitWithState('RequestExplainer');
    }
  },
  //
  'HomePage': function () {
    console.log('ITERATING_EXPLAINER - HomePage')
    var slot = slot || this.event.request.intent.slots;
    if (this.attributes.ITERATING) {
      console.log("ITERATING_EXPLAINER -- ARTIFACT -- HomePage, sending back")
      return this.emitWithState('ListExplainers');
    } else {
      this.attributes.indices.explainer = 0;

      console.log("ACTUALLY HomePage REDIRECTING", JSON.stringify(this.event.request.intent, null,2))
      this.handler.state = this.attributes.STATE = config.states.HOME_PAGE;
      this.emitWithState('HomePage');
    }
  },


  'ChangeMyInfo' : function () {
    console.log('ITERATING_EXPLAINER - ChangeMyInfo')
    var slot = slot || this.event.request.intent.slots;
    if (this.attributes.ITERATING) {
      console.log("ITERATING_EXPLAINER -- ARTIFACT -- ChangeMyInfo, sending back")
      return this.emitWithState('ListExplainers');
    } else {
      this.attributes.indices.explainer = 0;
      console.log("ACTUALLY ChangeMyInfo REDIRECTING", JSON.stringify(this.event.request.intent, null,2))
      this.handler.state = this.attributes.STATE = config.states.CHANGE_INFO;
      this.emitWithState('ChangeMyInfo');
    }
  },
  'PlayLatestExplainer': function () {
    // this is what 'play all would do'
    console.log('ITERATING_EXPLAINER - PlayLatestExplainer')
    var slot = slot || this.event.request.intent.slots;
    if (this.attributes.ITERATING) {
      console.log("ITERATING_EXPLAINER -- ARTIFACT -- PlayLatestExplainer, sending back")
      return this.emitWithState('ListExplainers');
    } else {
      this.attributes.indices.explainer = 0;

      console.log("ACTUALLY PlayLatestExplainer REDIRECTING", JSON.stringify(this.event.request.intent, null,2))
      this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
      this.emitWithState('PickItem', {index: {value: 1}}, 'LATEST_FROM_ITERATING');
    }

  },

  'ReplayExplainer': function () {
    console.log("ITERATING_EXPLAINER state, ReplayExplainer", JSON.stringify(this.event.request, null,2));
    this.emitWithState('ListExplainers', 'repeating');
  },

  'RepeatOptions': function () {
    console.log("ITERATING_EXPLAINER state, RepeatOptions", JSON.stringify(this.event.request, null,2));
    this.emitWithState('ListExplainers', 'repeating');
  },

  'AMAZON.StopIntent' : function() {
    console.log('STOP, iterating')
    // This needs to work for not playing as well
    delete this.attributes.ITERATING
    delete this.attributes.STATE;
    this.attributes.indices.explainer = 0;
    this.response.speak(config.stopMessage)
    this.emit(':saveState');
  },
  'AMAZON.CancelIntent' : function() {
    console.log('CANCEL iterating');
    // means they don't wnt to leave it.
    delete this.attributes.ITERATING
    delete this.attributes.STATE;
    this.attributes.indices.explainer = 0;
    this.response.speak(config.cancelMessage);

    this.response.speak('Cancelled! Say Alexa, Make Me Smart to come back.')
    this.emit(':saveState');
  },
  'SessionEndedRequest' : function () {
    delete this.attributes.ITERATING;
    delete this.attributes.STATE;
    this.attributes.indices.explainer = 0;

    console.log("IT  EXPLAINER  session end", JSON.stringify(this.event.request, null,2));
   },
   'AMAZON.HelpIntent' : function () {
     console.log('ITERATING_EXPLAINER HelpIntent', JSON.stringify(this.event.request.intent, null,2));
     let NAME_TESTING = Object.keys(config.testIds).indexOf(this.attributes.userId) > -1;
     if (NAME_TESTING) {
       console.log("ITERATING TEST DELETING name and location and req flags");
       delete this.attributes.UNRESOLVED;
       delete this.attributes.SUGGESTION;
       delete this.attributes.userName;
       delete this.attributes.userLocation;
       delete this.attributes.NAME_REQUESTED;
       delete this.attributes.LOCATION_REQUESTED;
       delete this.attributes.REQUESTS;
       delete this.attributes.plays;
     }
     var message = `You can choose an explainer by name or ${config.ipaNumber}, or say 'older' or 'newer' to move through the list. Say repeat to list the explainers again. What would you like to do?`;
     this.response.speak(message).listen(message);
     if (this.event.context.System.device.supportedInterfaces.Display) {
       this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Help', util.clearProsody(message), null, config.background.show));
     }
     this.emit(':saveState', true);
   },
   'Unhandled' : function () {
     console.log('ITERATING_EXPLAINER Unhandled',JSON.stringify(this.event.request.intent, null, 2))
     var message = `Sorry I couldn't quite understand that. You can choose an explainer by name or ${config.ipaNumber}, or say 'older' or 'newer' to move through the list. Say repeat to list the explainers again. What would you like to do?`;

     this.response.speak(message).listen("Would you like to repeat the options or play the latest?");
     if (this.event.context.System.device.supportedInterfaces.Display) {
       this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Unhandled', util.clearProsody(message), null, config.background.show));
     }
     this.emit(':saveState', true);

   }


})
