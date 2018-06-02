var Alexa = require('alexa-sdk');

var config = require('../config');
var util = require('../util');

var explainers = require('../explainers')

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
  TopicOnly: function () {
    console.log("ITERATING_EXPLAINER TopicOnly", JSON.stringify(this.event.request.intent, null,2))
    var slot = slot || this.event.request.intent.slots;

    this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
    this.emitWithState('PickItem', slot, 'ITERATING');

  },
  IndexOnly: function () {
    console.log("ITERATING_EXPLAINER IndexOnly", JSON.stringify(this.event.request.intent, null,2))
    var slot = slot || this.event.request.intent.slots;

    this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
    this.emitWithState('PickItem', slot, 'ITERATING');

  },
  OrdinalOnly: function () {
    console.log("ITERATING_EXPLAINER OrdinalOnly", JSON.stringify(this.event.request.intent, null,2))
    var slot = slot || this.event.request.intent.slots;
    this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
    this.emitWithState('PickItem', slot, 'ITERATING');
  },
  'ListExplainers': function (condition) {
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    if (this.event.session.new || (!this.attributes.indices.explainer)) { // is this logic correct?
      this.attributes.indices.explainer = 0;
    }
    var slot = slot || this.event.request.intent.slots;
    console.log("LIST_EXPLAINERS ListExplainer, SLOT", slot, ' and condition ', condition)
    if (slot && slot.query && slot.query.value && !condition) {
      console.log('IT EXP, LIST EXP, got a query', slot.query.value);
      let resolvedIntent = util.intentCheck(slot.query.value);
      if (resolvedIntent) {
        console.log(`ITERATING_EXPLAINERS listExplainers: got ${slot.query.value} in query.`)
        delete slot.query.value;
        return this.emitWithState(resolvedIntent, slot);
      } else {
        return this.emitWithState('PickItem', slot)
      }
    }
    var data = util.itemLister(
      explainers,
      `explainers`,
      'title',
      this.attributes.indices.explainer,
      config.items_per_prompt.explainer
    );
    // this.response.speak(data.itemsAudio).listen('Pick one or say older or earlier to move forward or backward through list.').cardRenderer(data.itemsCard);
    // if (this.event.context.System.device.supportedInterfaces.Display) {
    //   this.response.renderTemplate(
    //     util.templateListTemplate1(
    //       'Explainers',
    //       'list-explainers',
    //       'Explainer',
    //       'title',
    //       explainers
    //     )
    //   );
    // }
    // this.emit(':responseReady');


    this.emit(':elicitSlotWithCard', 'query', data.itemsAudio, "Pick one or say newer or older to move forward or backward through list.", 'List of Explainers', data.itemsCard, this.event.request.intent, util.cardImage(config.icon.full) );
  },
  // STATE TRANSITIONS
  'RequestExplainer' : function () {
    console.log('request explainer test IN LIST EXPLAINERS!')
    var slot = slot || this.event.request.intent.slots;
    if (slot && slot.query && slot.query.value) {
      let resolvedIntent = util.intentCheck(slot.query.value);
      if (resolvedIntent) {
        console.log(`ITERATING_EXPLAINERS requestExplainer: got ${slot.query.value} in query.`)
        delete slot.query.value;
        return this.emitWithState(resolvedIntent, slot);
      } else {
        console.log('ITERATING_EXPLAINERS, sending to pick ', slot)
        return this.emitWithState('PickItem', slot)
      }
    } else {
      console.log("ITERATING_EXPLAINERS , got requestExplainer with no slot. REDIRECTING")
      this.handler.state = this.attributes.STATE = config.states.REQUEST;
      return this.emitWithState('RequestExplainer', {query: {value:null},userLocation: {value: null}, userName: {value: null}});
    }
    // if (util.intentCheck(slot.query.value)) {
    //   if (util.intentCheck(slot.query.value) === 'RequestExplainer') {
    //     console.log('got actual request via query on iterating. Damn.')
    //     this.handler.state = this.attributes.STATE = config.states.REQUEST;
    //     return this.emitWithState('RequestExplainer');
    //   } else {
    //     console.log("Got a req", util.intentCheck(slot.query.value))
    //     return this.emitWithState(util.intentCheck(slot.query.value), 'req_in_it', slot)
    //   }
    // }
  },
  'PickItem': function (slot) {
    console.log('ITERATING EXPLAINER, pick explainer');
    console.log('manual slot', slot);
    console.log('alexa EVENT',JSON.stringify(this.event.request));

    this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
    this.emitWithState('PickItem', slot, 'ITERATING');
  },

  //
  'HomePage': function () {
    var slot = slot || this.event.request.intent.slots;
    console.log("HOME PAGE in ITERATING?", JSON.stringify(this.event.request,null,2))

    if (slot && slot.query && slot.query.value) {
      let resolvedIntent = util.intentCheck(slot.query.value);
      if (resolvedIntent) {
        console.log(`ITERATING_EXPLAINERS homePage: got ${slot.query.value} in query.`)
        delete slot.query.value;
        return this.emitWithState(resolvedIntent, slot);
      } else {
        console.log('ITERATING_EXPLAINERS homePage, sending to pick ', slot)
        return this.emitWithState('PickItem', slot)
      }
    } else {
      console.log("ITERATING_EXPLAINERS , got HOME PAGE with no query. REDIRECTING")
      this.handler.state = this.attributes.STATE = config.states.HOME_PAGE;
      return this.emitWithState('HomePage', 'no_welcome');
    }
    // if (util.intentCheck(slot.query.value)) {
    //   if (util.intentCheck(slot.query.value) === 'HomePage') {
    //     console.log('got actual home page via query on iterating. Damn.')
    //     this.handler.state = this.attributes.STATE = config.states.HOME_PAGE;
    //     return this.emitWithState('HomePage', 'no_welcome');
    //   } else {
    //     console.log("Got a req", util.intentCheck(slot.query.value))
    //     return this.emitWithState(util.intentCheck(slot.query.value), slot)
    //   }
    // } else {
    //   return this.emitWithState('PickItem', slot)
    // }
    //
    // this.handler.state = this.attributes.STATE = config.states.HOME_PAGE;
    // this.emitWithState('HomePage', 'no_welcome');
  },


  // TOUCH EVENTS
  'ElementSelected': function () {
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);

    // handle play latest or pick episode actions
    console.log('ElementSelected -- ', this.event.request)
    var intentSlot,intentName;
    if (this.event.request.token === 'PlayLatestEpisode' || this.event.request.token === 'ListEpisodes') { // I don't think I use either
      intentName = this.event.request.token;
      intentSlot = {
        index: {
          value: this.attributes.show
        }
      }
    }  else if (this.event.request.token.indexOf('_') > -1) {
      var tokenData = this.event.request.token.split('_');
      intentName = tokenData[0];
      intentSlot = {
        index: {
          value: parseInt(tokenData[1]) + 1
        }
      }
    }
    console.log('IT EXPLAIN TOUCH', intentName, intentSlot);
    this.emitWithState(intentName, intentSlot);
  },

  //BUILT IN
  'EarlierExplainers' : function () {
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    let boundThis = this;
    var slot = slot || this.event.request.intent.slots;

    console.log("ITERATING_EXPLAINERS EarlierExplainers", this.event.request.intent)


    if (this.attributes.indices.explainer + config.items_per_prompt.explainer >= explainers.length) {
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
    }
    if (!this.attributes.indices.explainer) {
      this.attributes.indices.explainer = 0;
    }
    this.attributes.indices.explainer += config.items_per_prompt.explainer;
    this.emitWithState('ListExplainers', 'earlier');

  },

  'LaterExplainers' : function () {
    console.log("ITERATING_EXPLAINERS LaterExplainers", this.event.request);
    var slot = slot || this.event.request.intent.slots;
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    this.attributes.indices.explainer -= config.items_per_prompt.explainer;
    if (this.attributes.indices.explainer < 0) {
      this.attributes.indices.explainer = 0;
    }
    this.emitWithState('ListExplainers', 'later');

  },
  'ChangeMyInfo' : function () {
    this.handler.state = this.attributes.STATE = config.states.REQUEST;
    this.emitWithState('ChangeMyInfo');
  },
  'PlayLatestExplainer': function () {
    // this is what 'play all would do'
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    this.emitWithState('PickItem', {index: {value: 1}}, 'LATEST_FROM_ITERATING');
  },

  'AMAZON.HelpIntent' : function () {
    console.log('Help in ITERATING EXPLAINER')
    var message = "You can pick an item by number or say 'older' or 'newer' to move through the list.";
    this.response.speak(message).listen(message);
    if (this.event.context.System.device.supportedInterfaces.Display) {
      var links = "<action value='HomePage'>What's New</action>";
      this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Help', message, links, config.background.show));
    }
    this.emit(':saveState', true);
  },
  'AMAZON.StopIntent' : function() {
    console.log('STOP, iterating')
    // This needs to work for not playing as well
    delete this.attributes.STATE;
    this.attributes.indices.explainer = 0;
    this.response.speak('See you later. Say Alexa, Make Me Smart to get learning again.')
    this.emit(':saveState');

    // this.handler.state = this.attributes.STATE = config.states.HOME_PAGE;
    // this.emitWithState('HomePage', 'no_welcome', "Got it, I won't put in that request.");

  },
  'AMAZON.CancelIntent' : function() {
    console.log('CANCEL iterating');
    // means they don't wnt to leave it.
    delete this.attributes.STATE;
    this.attributes.indices.explainer = 0;
    this.response.speak('See you later. Say Alexa, Make Me Smart to get learning again.')
    this.emit(':saveState');

    // this.handler.state = this.attributes.STATE = config.states.HOME_PAGE;
    // this.emitWithState('HomePage', 'no_welcome', "Got it, I won't put in that request.");
  },
  'SessionEndedRequest' : function () {
    console.log("IT  EXPLAINER  session end", JSON.stringify(this.event.request, null,2));
   },
   'Unhandled' : function () {
     console.log('UNHANDLED ITERATING EXPLAINER',JSON.stringify(this.event, null, 2))
     var message = "Sorry I couldn't quite understand that. Make sure to use the numbers before the topics if you're having trouble. Say 'list explainers' to hear the options again or 'play the latest' to hear our latest explainer."

     this.response.speak(message).listen("Would you like to 'list explainers' or 'play the latest'?");
     if (this.event.context.System.device.supportedInterfaces.Display) {
       this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Help', message, null, config.background.show));
     }
     this.emit(':saveState', true);

   }


})
