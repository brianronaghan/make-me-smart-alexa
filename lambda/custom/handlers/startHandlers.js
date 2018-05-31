'use strict';

var Alexa = require('alexa-sdk');

var config = require('../config');
var util = require('../util');
var db = require('../db');

var explainers = require('../explainers');

var startHandlers =  Alexa.CreateStateHandler(config.states.START, {
  'LaunchRequest': function (condition, message) {
    console.log("LAUNCH REQUEST", this.event.request, "ATS", this.attributes)
    let welcome = '';
    let prompt = "You can replay that, hear what's new or suggest a topic. What would you like to do?"
    let latestExplainer = explainers[0];
    let author = latestExplainer.author;
    if (author === 'Molly Wood') {
      author = `Molly '<emphasis level="strong"> Wood</emphasis>`;
    }
    let links = "<action value='ReplayExplainer'>Replay</action> | <action value='HomePage'>Hear What's New</action> | <action value='RequestExplainer'> Suggest a Topic </action>";

    if (!this.attributes.deviceIds) {
      welcome =`<audio src="${config.newUserAudio}" /><audio src="${latestExplainer.audio.url}"/>`;
    } else if (this.attributes.LATEST_HEARD && this.attributes.LATEST_HEARD === latestExplainer.guid) {
      // user has heard todays
      welcome = `Welcome back to Make Me Smart. `
      prompt =  `You can replay today's explainer on ${latestExplainer.title}, hear what's new or suggest a topic. Which would you like to do?`;
      if (this.event.context.System.device.supportedInterfaces.Display) {
        this.response.renderTemplate(
          util.templateBodyTemplate3(
            latestExplainer.title,
            latestExplainer.image || config.icon.full,
            latestExplainer.description,
            "You can replay that, hear what's new or suggest a topic.",
            config.background.show
          )
        );
      }
      let fullSpeech = welcome + prompt;
      this.response.speak(fullSpeech).listen(prompt);
      return this.emit(':responseReady');
    } else if (latestExplainer.audio.intro) {
      welcome =`<audio src="${latestExplainer.audio.intro}" /><audio src="${latestExplainer.audio.url}"/>`;
    } else {
      welcome = `Welcome back to Make Me Smart. Today we're learning about ${latestExplainer.title}. Here's ${author} to make us smart. <audio src="${latestExplainer.audio.url}"/>`;
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
            "You can replay that, hear what's new or suggest a topic.",
            config.background.show
          )
        );
      }
      let fullSpeech = welcome + prompt;
      this.response.speak(fullSpeech).listen(prompt);
      this.emit(':saveState');
    });
  },
  'HomePage': function (condition, message) {
    console.log("HEY HOME PAGE REDIRECT")
    this.handler.state = this.attributes.STATE = config.states.HOME_PAGE;
    this.emitWithState('HomePage', 'from_launch');
  },
  'RequestExplainer' : function () {
    console.log('request explainer FROM START')
    this.handler.state = this.attributes.STATE = config.states.REQUEST;
    this.emitWithState('RequestExplainer');
  },
  'PickItem' : function (slot) {
    console.log("HEY PICK from start?")

    // redirects from homepage to play explainer choice
    this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
    this.emitWithState('PickItem', slot, 'LAUNCH_PICK');
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

  // TOUCH EVENTS:
  'ElementSelected': function () {
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);

    // handle play latest or pick episode actions
    console.log('ElementSelected -- ', this.event.request)
    var intentSlot,intentName;
    if (this.event.request.token === 'ReplayExplainer') {
      intentName = this.event.request.token;
    } else if (this.event.request.token === 'RequestExplainer' || this.event.request.token === 'HomePage') {
      intentName = this.event.request.token;
    }
    console.log('PLAYING EXPLAINERS, TOUCH', intentName, intentSlot);
    this.emitWithState(intentName, intentSlot, 'TOUCH_HOMEPAGE');
  },



  'AMAZON.CancelIntent' : function() {
    console.log('CANCEL START STATE')
    // This needs to work for not playing as well
    delete this.attributes.STATE;

    this.response.speak("See you later. Say 'Alexa, Make Me Smart' to get learning again.");
    this.emit(':saveState');
  },
  'AMAZON.StopIntent' : function() {
    console.log('STOP EXPLAINER STATE')
    // This needs to work for not playing as well
    // SHOULD I CLEAR THE STATE?
    delete this.attributes.STATE;
    this.response.speak('See you later. Say alexa, Make Me Smart to get learning again.')
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
    var message = "You can say replay, hear what's new, or suggest a topic. What would you like to do?";
    this.response.speak(message).listen(message);
    if (this.event.context.System.device.supportedInterfaces.Display) {
      this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Help', message, null, config.background.show));
    }
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
     var prompt = "You can say replay, hear what's new, or suggest a topic. What would you like to do?";
     this.response.speak(message + prompt).listen(prompt);
     if (this.event.context.System.device.supportedInterfaces.Display) {
       this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Help', message + prompt, null, config.background.show));
     }
     this.emit(':saveState', true);
   }

});
module.exports = startHandlers;
