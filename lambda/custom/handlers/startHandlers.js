'use strict';

var Alexa = require('alexa-sdk');
var allExplainers = require('../explainers');
var config = require('../config');
var util = require('../util');
var db = require('../db');

var startHandlers =  Alexa.CreateStateHandler(config.states.START, {
  'LaunchRequest': function (condition, message) {
    let welcome = '';
    let prompt = "You can say next, hear what's new, or submit an idea. What would you like to do?"
    let latestExplainer = util.liveExplainers()[0];
    let author = util.authorName(latestExplainer.author);
    if (!this.attributes.deviceIds) { // NEW USER
      welcome =`<audio src="${config.newUserAudio}" /><audio src="${latestExplainer.audio.url}"/>`;
    } else if (this.attributes.LATEST_HEARD && this.attributes.LATEST_HEARD === latestExplainer.guid) { // has heard latest
      let LATEST_UNHEARD = util.latestUnheard.call(this);
      if (LATEST_UNHEARD) { // has heard latest, but I found an UNHEARD, so will play it
        welcome = `Welcome back to Make Me Smart. You've heard our latest topic, but here's ${util.authorName(LATEST_UNHEARD.author)} explaining ${LATEST_UNHEARD.title}`;

        if (LATEST_UNHEARD.requestInformation && LATEST_UNHEARD.requestInformation.user) {
          welcome += ` as requested by ${LATEST_UNHEARD.requestInformation.user}`;
          if (LATEST_UNHEARD.requestInformation.location) {
            welcome += ` from ${LATEST_UNHEARD.requestInformation.location}`
          }
        }
        welcome += `. <audio src="${LATEST_UNHEARD.audio.url}"/> `;
        prompt = "You can say next, hear what's new, or submit an idea. What would you like to do?"
        util.logExplainer.call(this, LATEST_UNHEARD);
        var payload = {};
        payload.explainers = [{
          source: "LAUNCH_ALREADY_HEARD",
          guid: LATEST_UNHEARD.guid,
          timestamp: this.event.request.timestamp,
        }]
        return db.update.call(this, payload, function(err, resp) {
          if (this.event.context.System.device.supportedInterfaces.Display) {
            this.response.renderTemplate(
              util.templateBodyTemplate3(
                LATEST_UNHEARD.title,
                LATEST_UNHEARD.image || config.icon.full,
                '',
                `Playing an explainer on ${LATEST_UNHEARD.title}. You can say replay or next, hear what's new or submit an idea for a new explainer.`,
                config.background.show
              )
            );
          }
          let fullSpeech = welcome + prompt;
          this.response.speak(fullSpeech).listen(prompt);
          delete this.attributes.STATE;
          this.emit(':saveState');
        });
      } else { // has heard latest + has HEARD ALL
        welcome = `Welcome back to Make Me Smart. Thanks for being a power user! `;
        prompt =  `You can replay our latest on ${latestExplainer.title}, browse all or submit your idea. Which would you like to do?`;
        if (this.event.context.System.device.supportedInterfaces.Display) {
          this.response.renderTemplate(
            util.templateBodyTemplate3(
              latestExplainer.title,
              latestExplainer.image || config.icon.full,
              '',
              prompt,
              config.background.show
            )
          );
        }
        let fullSpeech = welcome + prompt;
        this.response.speak(fullSpeech).listen(prompt);
        return this.emit(':saveState');
      }
    } else if (latestExplainer.audio.intro) { // hasn't heard latest, there's intro
      welcome =`<audio src="${latestExplainer.audio.intro}" /><audio src="${latestExplainer.audio.url}"/>`;
    } else { // hasn't heard latest, no intro
      welcome = `Welcome back to Make Me Smart. Today we're learning about ${latestExplainer.title}`;
      if (latestExplainer.requestInformation && latestExplainer.requestInformation.user) {
        welcome += ` as requested by ${latestExplainer.requestInformation.user}`;
        if (latestExplainer.requestInformation.location) {
          welcome += ` from ${latestExplainer.requestInformation.location}`
        }
      }
      welcome += `. Here's ${author} to make us smart. <audio src="${latestExplainer.audio.url}"/>`;
    }
    this.attributes.LATEST_HEARD = latestExplainer.guid;
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    util.logExplainer.call(this, latestExplainer);

    var payload = {};
    payload.explainers = [{
      source: "LAUNCH_REQUEST",
      guid: latestExplainer.guid,
      timestamp: this.event.request.timestamp,
    }]
    console.time('UPDATE-LAUNCH-REQUEST');
    db.update.call(this, payload, function(err, resp) {
      console.timeEnd('UPDATE-LAUNCH-REQUEST');
      if (this.event.context.System.device.supportedInterfaces.Display) {
        this.response.renderTemplate(
          util.templateBodyTemplate3(
            latestExplainer.title,
            latestExplainer.image || config.icon.full,
            '',
            `Today we're learning about ${latestExplainer.title}. You can say next or replay, hear what's new or submit an idea for a new explainer.`,
            config.background.show
          )
        );
      }
      let fullSpeech = welcome + prompt;
      this.response.speak(fullSpeech).listen(prompt);
      delete this.attributes.STATE;

      this.emit(':saveState');
    });
  },
  'HomePage': function (condition, message) {
    console.log("START state HomePage", JSON.stringify(this.event.request.intent, null,2))
    var slot;
    if (this.event.request.intent) {
      slot = this.event.request.intent.slots;
      if (slot.query && slot.query.value) {
        let intentCheck = util.intentCheck(slot.query.value);
        if (intentCheck) {
          console.log("START HomePage intentCheck -- got: ", slot.query.value)
          delete slot.query.value;
          return this.emitWithState(intentCheck);
        }
      }
    }
    console.log("START HomePage no query -> actual go to HomePage")
    this.handler.state = this.attributes.STATE = config.states.HOME_PAGE;
    if (!this.attributes.deviceIds) {
      console.log("NEW USER -- HomePage")
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      return this.emitWithState('HomePage', 'new_user_from_launch');
    } else {
      return this.emitWithState('HomePage', 'from_launch');
    }
  },
  'RequestExplainer' : function () {
    console.log('START state RequestExplainer', JSON.stringify(this.event.request.intent, null,2))

    var slot;
    if (this.event.request.intent) {
      slot = this.event.request.intent.slots;
      if (slot.query && slot.query.value) {
        let intentCheck = util.intentCheck(slot.query.value);
        if (intentCheck) {
          console.log("START RequestExplainer intentCheck -- got: ", slot.query.value)
          delete slot.query.value;
          return this.emitWithState(intentCheck);
        }
      }
    }
    console.log("START RequestExplainer no query -> actual go to RequestExplainer")

    this.handler.state = this.attributes.STATE = config.states.REQUEST;
    if (!this.attributes.deviceIds) {
      console.log("NEW USER -- RequestExplainer")
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      return this.emitWithState('RequestExplainer');
    } else {
      return this.emitWithState('RequestExplainer');
    }
  },
  'PickItem' : function (slot) {
    console.log('START state PickItem', JSON.stringify(this.event.request.intent, null,2))
    // DO I NEED TO CHECK THIS ALSO?
    this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
    if (!this.attributes.deviceIds) {
      console.log("NEW USER -- PickItem")
      var deviceId = util.getDeviceId.call(this);
      util.nullCheck.call(this, deviceId);
      return this.emitWithState('PickItem', slot, 'NEW_USER_LAUNCH_PICK');
    } else {
      return this.emitWithState('PickItem', slot, 'LAUNCH_PICK');
    }
  },
  'ReplayExplainer': function () {
    console.log('START state ReplayExplainer', JSON.stringify(this.event.request.intent, null,2))

    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    var slot;
    if (this.event.request.intent) {
      slot = this.event.request.intent.slots;
      if (slot.query && slot.query.value) {
        let intentCheck = util.intentCheck(slot.query.value);
        if (intentCheck) {
          console.log("START ReplayExplainer intentCheck -- got: ", slot.query.value)
          delete slot.query.value;
          return this.emitWithState(intentCheck);
        }
      }
    }
    console.log("START ReplayExplainer no query -> actual go to ReplayExplainer")

    // currentExplainerIndex is 0 based, and PickItem expects 1-based
    this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
    this.emitWithState('PickItem', {index: {value: 1}}, 'LAUNCH_REPLAY')

  },

  'PlayLatestExplainer': function () {
    console.log('START state PlayLatestExplainer', JSON.stringify(this.event.request, null,2))

    var slot;
    if (this.event.request.intent) {
      slot = this.event.request.intent.slots;
      if (slot && slot.query && slot.query.value) {
        let intentCheck = util.intentCheck(slot.query.value);
        if (intentCheck) {
          console.log("START PlayLatestExplainer intentCheck -- got: ", slot.query.value)
          delete slot.query.value;
          return this.emitWithState(intentCheck);
        }
      }
    }
    console.log("START PlayLatestExplainer no query -> actual go to PlayLatestExplainer")

    this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    this.emitWithState('PlayLatestExplainer', {index: {value: 1}}, 'LAUNCH_LATEST');


  },

  'ListExplainers': function () {
    console.log('START state ListExplainers', JSON.stringify(this.event.request.intent, null,2))
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    var slot;
    if (this.event.request.intent) {
      slot = this.event.request.intent.slots;
      if (slot.query && slot.query.value) {
        let intentCheck = util.intentCheck(slot.query.value);
        if (intentCheck) {
          console.log("START ListExplainers intentCheck -- ", slot.query.value)
          delete slot.query.value;
          return this.emitWithState(intentCheck);
        }
      }
    }
    console.log("START ListExplainers no query -> actual go to ListExplainers")
    this.attributes.currentExplainerIndex = -1;
    this.attributes.indices.explainer = 0;
    this.handler.state = this.attributes.STATE = config.states.ITERATING_EXPLAINER;
    this.emitWithState('ListExplainers', 'from_launch');

  },
  'OlderExplainers' : function () {
    console.log('START state OlderExplainers', JSON.stringify(this.event.request.intent, null,2))
    var slot;
    if (this.event.request.intent) {
      slot = this.event.request.intent.slots;
      if (slot.query && slot.query.value) {
        let intentCheck = util.intentCheck(slot.query.value);
        if (intentCheck) {
          console.log("START OlderExplainers intentCheck -- ", slot.query.value)
          delete slot.query.value;
          return this.emitWithState(intentCheck);
        }
      }
    }
    console.log("START OlderExplainers no query -> actual go to OlderExplainers")

    this.handler.state = this.attributes.STATE = config.states.ITERATING_EXPLAINER;
    this.emitWithState('OlderExplainers', 'older_from_start');

  },

  'NewerExplainers' : function () {
    console.log('START state NewerExplainers', JSON.stringify(this.event.request.intent, null,2))
    if (this.event.request.intent) {
      slot = this.event.request.intent.slots;
      if (slot.query && slot.query.value) {
        let intentCheck = util.intentCheck(slot.query.value);
        if (intentCheck) {
          console.log("START NewerExplainers intentCheck -- ", slot.query.value)
          delete slot.query.value;
          return this.emitWithState(intentCheck);
        }
      }
    }
    console.log("START NewerExplainers no query -> actual go to NewerExplainers")

    this.handler.state = this.attributes.STATE = config.states.ITERATING_EXPLAINER;
    this.emitWithState('NewerExplainers', 'newer_from_start');

  },

  'RepeatOptions': function () {
    console.log("START state, RepeatOptions", JSON.stringify(this.event.request, null,2));
    this.emitWithState('LaunchRequest', 'repeating');
  },


  // BUILT IN

  'AMAZON.CancelIntent' : function() {
    console.log('START CancelIntent')
    // This needs to work for not playing as well
    // this.response.speak(config.cancelMessage);
    delete this.attributes.STATE;
    this.emit(':saveState');
  },
  'AMAZON.StopIntent' : function() {
    console.log('START StopIntent')
    // This needs to work for not playing as well
    // SHOULD I CLEAR THE STATE?
    this.attributes.STOPS = this.attributes.STOPS || 0;
    this.attributes.STOPS++;
    if (this.attributes.STOPS === 1 || (this.attributes.STOPS % config.stopMessageFrequency === 0)) {
      this.response.speak(config.stopMessage);
    }
    delete this.attributes.STATE;
    this.emit(':saveState');
  },
  'AMAZON.NextIntent' : function () {
    console.log("start handler NEXT")
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
    this.emitWithState('PickItem', {index: {value: 2}}, 'LAUNCH_NEXT'); // NOTE you could make a case, if it's an old one... we should move in that spot in the list, OR it should always try for one you havent heard. There's some case logic i need to consider
  },

  'AMAZON.HelpIntent': function () {
    console.log('Help in START');


    // Handler for built-in HelpIntent
    var message = "You can say next or replay, hear what's new, or submit your idea for an explainer. What would you like to do?";
    this.response.speak(message).listen(message);
    if (this.event.context.System.device.supportedInterfaces.Display) {
      this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Help', message, null, config.background.show));
    }
    delete this.attributes.STATE;
    this.emit(':saveState', true);
  },
  // error handling
  'SessionEndedRequest' : function () { // this gets purposeful exit as well
    delete this.attributes.STATE;
    console.log("SESSION ENDED IN START")
    this.emit(':saveState');
   },
   'Unhandled' : function () {
     console.log("START UNHANDLED ",JSON.stringify(this.event.request,null, 2));
     var message = "Sorry I couldn't quite understand that. ";
     var prompt = "You can replay the explainer, hear what's new, or submit your explainer idea. What would you like to do?";
     this.response.speak(message + prompt).listen(prompt);
     if (this.event.context.System.device.supportedInterfaces.Display) {
       this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Help', message + prompt, null, config.background.show));
     }
     delete this.attributes.STATE;
     this.emit(':saveState', true);
   }

});
module.exports = startHandlers;
