'use strict';

var Alexa = require('alexa-sdk');
var allExplainers = require('../explainers');
var config = require('../config');
var util = require('../util');
var db = require('../db');

var startHandlers =  Alexa.CreateStateHandler(config.states.START, {
  'LaunchRequest': function (condition, message) {
    let welcome = '';
    let prompt = "You can replay the explainer, hear what's new or submit an idea for what we should explain next. What would you like to do?"
    let latestExplainer = util.liveExplainers()[0];
    let author = latestExplainer.author;
    if (author === 'Molly Wood') {
      author = `Molly '<emphasis level="strong"> Wood</emphasis>`;
    }
    console.log("--------- START state LaunchRequest --------")
    console.log(JSON.stringify(this.event.request, null,2));
    if (this.event.request.intent) {
      console.log("PHANTOM INTENT on LR -- AMAZON BUG");
      console.log(JSON.stringify(this.event.request.intent, null, 2))
    }
    if (!this.attributes.deviceIds) {
      welcome =`<audio src="${config.newUserAudio}" /><audio src="${latestExplainer.audio.url}"/>`;
    } else if (this.attributes.LATEST_HEARD && this.attributes.LATEST_HEARD === latestExplainer.guid) {
      // user has heard todays
      welcome = `Welcome back to Make Me Smart. `
      prompt =  `You can replay today's explainer on ${latestExplainer.title}, hear what's new or submit your explainer idea. Which would you like to do?`;
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
    } else if (latestExplainer.audio.intro) {
      welcome =`<audio src="${latestExplainer.audio.intro}" /><audio src="${latestExplainer.audio.url}"/>`;
    } else {
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
            `Today we're learning about ${latestExplainer.title}. You can replay it, hear what's new or submit an idea for a new explainer.`,
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
          console.log("START HomePage intentCheck -- slot.query.value ", slot.query.value)
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
          console.log("START RequestExplainer intentCheck -- slot.query.value ", slot.query.value)
          delete slot.query.value;
          return this.emitWithState(intentCheck);
        }
      }
    }
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
    console.log("START PickItem ")
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
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    var slot;
    if (this.event.request.intent) {
      slot = this.event.request.intent.slots;
      if (slot.query && slot.query.value) {
        let intentCheck = util.intentCheck(slot.query.value);
        if (intentCheck) {
          console.log("START ReplayExplainer intentCheck -- slot.query.value ", slot.query.value)
          delete slot.query.value;
          return this.emitWithState(intentCheck);
        }
      }
    }
    console.log('GOT REPLAY', this.handler.state)
    // currentExplainerIndex is 0 based, and PickItem expects 1-based
    this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
    this.emitWithState('PickItem', {index: {value: 1}}, 'LAUNCH_REPLAY')

  },

  'PlayLatestExplainer': function () {
    // this is what 'play all would do'
    var slot;
    if (this.event.request.intent) {
      slot = this.event.request.intent.slots;
      if (slot.query && slot.query.value) {
        let intentCheck = util.intentCheck(slot.query.value);
        if (intentCheck) {
          console.log("START PlayLatestExplainer intentCheck -- slot.query.value ", slot.query.value)
          delete slot.query.value;
          return this.emitWithState(intentCheck);
        }
      }
    }
    this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    this.emitWithState('PlayLatestExplainer', {index: {value: 1}}, 'LAUNCH_LATEST');


  },
  'ChangeMyInfo' : function () {
    var slot;
    if (this.event.request.intent) {
      slot = this.event.request.intent.slots;
      if (slot.query && slot.query.value) {
        let intentCheck = util.intentCheck(slot.query.value);
        if (intentCheck) {
          console.log("START ChangeMyInfo intentCheck -- slot.query.value ", slot.query.value)
          delete slot.query.value;
          return this.emitWithState(intentCheck);
        }
      }
    }
    this.handler.state = this.attributes.STATE = config.states.CHANGE_INFO;
    this.emitWithState('ChangeMyInfo');

  },
  'ListExplainers': function () {
    console.log('START ListExplainers')
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    var slot;
    if (this.event.request.intent) {
      slot = this.event.request.intent.slots;
      if (slot.query && slot.query.value) {
        let intentCheck = util.intentCheck(slot.query.value);
        if (intentCheck) {
          console.log("START ListExplainers intentCheck -- slot.query.value ", slot.query.value)
          delete slot.query.value;
          return this.emitWithState(intentCheck);
        }
      }
    }
    this.attributes.currentExplainerIndex = -1;
    this.attributes.indices.explainer = 0;
    this.handler.state = this.attributes.STATE = config.states.ITERATING_EXPLAINER;
    this.emitWithState('ListExplainers', 'from_launch');

  },
  'OlderExplainers' : function () {
    console.log("OlderExplainers in START");
    var slot;
    if (this.event.request.intent) {
      slot = this.event.request.intent.slots;
      if (slot.query && slot.query.value) {
        let intentCheck = util.intentCheck(slot.query.value);
        if (intentCheck) {
          console.log("START OlderExplainers intentCheck -- slot.query.value ", slot.query.value)
          delete slot.query.value;
          return this.emitWithState(intentCheck);
        }
      }
    }
    this.handler.state = this.attributes.STATE = config.states.ITERATING_EXPLAINER;
    this.emitWithState('OlderExplainers', 'older_from_start');

  },

  'NewerExplainers' : function () {
    console.log("NewerExplainers in START");
    if (this.event.request.intent) {
      slot = this.event.request.intent.slots;
      if (slot.query && slot.query.value) {
        let intentCheck = util.intentCheck(slot.query.value);
        if (intentCheck) {
          console.log("START NewerExplainers intentCheck -- slot.query.value ", slot.query.value)
          delete slot.query.value;
          return this.emitWithState(intentCheck);
        }
      }
    }
    this.handler.state = this.attributes.STATE = config.states.ITERATING_EXPLAINER;
    this.emitWithState('NewerExplainers', 'newer_from_start');

  },

  // BUILT IN

  'AMAZON.CancelIntent' : function() {
    console.log('START CancelIntent')
    // This needs to work for not playing as well
    this.response.speak(config.cancelMessage);
    delete this.attributes.STATE;
    this.emit(':saveState');
  },
  'AMAZON.StopIntent' : function() {
    console.log('START StopIntent')
    // This needs to work for not playing as well
    // SHOULD I CLEAR THE STATE?
    this.response.speak(config.stopMessage)
    delete this.attributes.STATE;
    this.emit(':saveState');
  },
  'AMAZON.NextIntent' : function () {
    console.log("start handler NEXT")
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
    this.emitWithState('PickItem', {index: {value: 2}}, 'LAUNCH_NEXT'); // NOTE TEST 1 or 2?
  },

  'AMAZON.HelpIntent': function () {
    console.log('Help in START');
    let NAME_TESTING = Object.keys(config.testIds).indexOf(this.attributes.userId) > -1;
    if (NAME_TESTING) {
      console.log("ALL EXPLAINERS :");
      console.log(JSON.stringify(allExplainers, null, 2))
      console.log('Live: ', util.liveExplainers().length, ' out of ', allExplainers.length);
      console.log("CLEARING LATEST FOR TESTER: ");
      delete this.attributes.LATEST_HEARD;
    }


    // Handler for built-in HelpIntent
    var message = "You can replay the explainer, hear what's new, or submit your idea for an explainer. What would you like to do?";
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
