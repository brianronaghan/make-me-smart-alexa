'use strict';

var Alexa = require('alexa-sdk');

var config = require('../config');
var util = require('../util');
var db = require('../db');

var explainers = require('../explainers');

var startHandlers =  Alexa.CreateStateHandler(config.states.START, {
  'LaunchRequest': function (condition, message) {
    console.log("START LaunchRequest", this.event.request.intent);
    let welcome = '';
    let prompt = "You can replay that, hear what's new or submit an idea for what we should explain next. What would you like to do?"
    let latestExplainer = explainers[0];
    let author = latestExplainer.author;
    if (author === 'Molly Wood') {
      author = `Molly '<emphasis level="strong"> Wood</emphasis>`;
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
            latestExplainer.description,
            "You can replay that, hear what's new or submit an explainer idea.",
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
            latestExplainer.description,
            "You can replay that, hear what's new or submit an idea for a new explainer.",
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
    // redirects from start to play explainer choice
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
    console.log('GOT REPLAY', this.handler.state)
    // currentExplainerIndex is 0 based, and PickItem expects 1-based
    this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
    this.emitWithState('PickItem', {index: {value: 1}}, 'LAUNCH_REPLAY')
  },

  'PlayLatestExplainer': function () {
    // this is what 'play all would do'
    this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    this.emitWithState('PlayLatestExplainer', {index: {value: 1}}, 'LAUNCH_LATEST');
  },
  'ChangeMyInfo' : function () {
    this.handler.state = this.attributes.STATE = config.states.REQUEST;
    this.emitWithState('ChangeMyInfo');
  },
  'ListExplainers': function () {
    console.log('list explainers from start')
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    this.attributes.currentExplainerIndex = -1;
    this.attributes.indices.explainer = 0;
    this.handler.state = this.attributes.STATE = config.states.ITERATING_EXPLAINER;
    this.emitWithState('ListExplainers', 'from_launch');
  },
  'OlderExplainers' : function () {
    console.log("OlderExplainers in HOME_PAGE");

    this.handler.state = this.attributes.STATE = config.states.ITERATING_EXPLAINER;
    this.emitWithState('OlderExplainers', 'older_from_start');
  },

  'NewerExplainers' : function () {
    console.log("NewerExplainers in HOME_PAGE");
    this.handler.state = this.attributes.STATE = config.states.ITERATING_EXPLAINER;
    this.emitWithState('NewerExplainers', 'newer_from_start');
  },

  // BUILT IN


  'AMAZON.CancelIntent' : function() {
    console.log('START CancelIntent')
    // This needs to work for not playing as well

    this.response.speak("See you later. Say 'Alexa, Make Me Smart' to get learning again.");
    delete this.attributes.STATE;
    this.emit(':saveState');
  },
  'AMAZON.StopIntent' : function() {
    console.log('START StopIntent')
    // This needs to work for not playing as well
    // SHOULD I CLEAR THE STATE?
    this.response.speak('See you later. Say alexa, Make Me Smart to get learning again.')
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

    // Handler for built-in HelpIntent
    var message = "You can replay that, hear what's new, or submit your idea for an explainer. What would you like to do?";
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
     var prompt = "You can replay that, hear what's new, or submit your explainer idea. What would you like to do?";
     this.response.speak(message + prompt).listen(prompt);
     if (this.event.context.System.device.supportedInterfaces.Display) {
       this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Help', message + prompt, null, config.background.show));
     }
     delete this.attributes.STATE;
     this.emit(':saveState', true);
   }

});
module.exports = startHandlers;
