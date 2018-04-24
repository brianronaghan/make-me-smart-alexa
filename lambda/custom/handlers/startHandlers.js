'use strict';

var Alexa = require('alexa-sdk');

var config = require('../config');
var util = require('../util');

var explainers = require('../explainers');

var startHandlers =  Alexa.CreateStateHandler(config.states.START, {
  // 'NewSession': function () {
  // //   console.log('new session ', JSON.stringify(this.event, null, 2));
  // },
  'LaunchRequest': function (condition, message) {
    console.log('LAUNCH in, START STATE. handler state', this.handler.state, ' atty state', this.attributes.STATE)
    var deviceId = util.getDeviceId.call(this);
    var intro = '';
    console.log('con --> ', condition, message)
    if (!condition) { // FIX THIS THING
      intro += `Welcome ${this.attributes.deviceId ? 'back' : ''} to Make Me Smart. This week `;
    } else if (condition === 'requested') {
      if (message) {
        intro += `${message} `;
      }
      intro += 'In the meantime, ';
    } else if (condition === 'no_welcome') {
      if (message) {
        intro += `${message} `;
      }
      intro += 'This week ';
    } else if (condition === 'finished_playing') {
      if (message) {
        intro += message;
      }
      intro += 'You might also like our explainers. This week ';
    }
    util.nullCheck.call(this, deviceId);
    // I DON'T THINK I NEED TO RESET:
    // this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;

    var topics = explainers.map(function(item) {
      return item.title
    });
    intro += `we're learning about <prosody pitch="high" volume="x-loud">1) ${topics[0]}</prosody>, <prosody volume="x-loud" pitch="high">2) ${topics[1]}</prosody>, and <prosody volume="x-loud" pitch="high">3) ${topics[2]}</prosody>. Pick one, or say 'play all' to learn about all of them.`;


    // On add the and that was to the speech... not for card'
    var links = "<action value='PlayLatestExplainer'>Play All</action>";
    this.response.speak(intro).listen("Pick one, or say 'play all' to learn about all of them.");
    if (this.event.context.System.device.supportedInterfaces.Display) {
      this.response.renderTemplate(util.templateBodyTemplate1('Welcome to Make Me Smart', intro, links, config.background.show));
    }
    this.emit(':responseReady');

  },
  'PickItem' : function (slot) {
    // redirects from homepage to play explainer choice
    this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
    this.emitWithState('PickItem', slot, 'HOME_PAGE');
  },
  'PlayLatestExplainer': function () {
    // this is what 'play all would do'
    this.handler.state = this.attributes.STATE = config.states.PLAYING_EXPLAINER;
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    this.emitWithState('PlayLatestExplainer', {index: {value: 1}}, 'HOME_PAGE_PLAY_LATEST');
  },

  'AMAZON.CancelIntent' : function() {
    console.log('CANCEL START STATE')
    // This needs to work for not playing as well
    delete this.attributes.STATE;

    this.response.speak("See you later. Say 'Alexa, Make Me Smart' to get learning again.");
    this.emit(':saveState');
  },
  'AMAZON.HelpIntent': function () {
    console.log('Help in START');

    // Handler for built-in HelpIntent
    var message = "You can say the name of an explainer or the number, or 'play all' to hear them all.";
    this.response.speak(message).listen(message);
    if (this.event.context.System.device.supportedInterfaces.Display) {
      var links = "<action value='PlayLatestExplainer'>Play All</action>";
      this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Help', message, links, config.background.show));
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
       var message = 'UNDHANDLED Start';
       this.response.speak(message).listen(message);
       this.emit(':responseReady');
   }
});
module.exports = startHandlers;
