var Alexa = require('alexa-sdk');

var config = require('../config');
var util = require('../util');
var feeds = config.feeds;

var feedHelper = require('../feedHelpers');
var feedLoader = feedHelper.feedLoader;

var audioPlayer = require('../audioPlayer');
var explainers = require('../explainers')


module.exports = Alexa.CreateStateHandler(config.states.EXPLAINER_DURING_EPISODE, {
  'LaunchRequest' : function () {
    delete this.attributes.IN_PROGRESS_EP;
    this.handler.state = this.attributes.STATE = config.states.PLAYING_EPISODE;
    var confirmationMessage = `Welcome back to Make me Smart. Last time you were hearing an explainer while listening to ${this.attributes.playing.title}. I'll resume the episode.`;
    audioPlayer.resume.call(this, confirmationMessage);
  },
  'PickItem': function (slot) {
    // set spot in indices
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    var slot = slot || this.event.request.intent.slots;
    var chosenExplainer = util.itemPicker(slot, explainers, 'title', 'topic');
    this.attributes.currentExplainerIndex = chosenExplainer.index;
    // util.logExplainer.call(this, chosenExplainer); // don't want to wipe out the playing ep
    var intro = `Here's ${chosenExplainer.author} explaining ${chosenExplainer.title}. <audio src="${chosenExplainer.audio.url}" />. `;
    var prompt;
    var links = "<action value='ReplayExplainer'>Replay</action> | <action value='Resume'>Resume Episode</action>";

    prompt = `Say 'replay' to hear that again, or 'resume' to continue ${this.attributes.playing.title}.`;

    if (this.event.context.System.device.supportedInterfaces.Display) {
      this.response.renderTemplate(
        util.templateBodyTemplate3(
          chosenExplainer.title,
          chosenExplainer.image || config.icon.full,
          chosenExplainer.description,
          links,
          config.background.show
        )
      );
    }
    var fullSpeech = intro + prompt;
    this.response.speak(fullSpeech).listen(prompt);
    this.emit(':saveState', true);

  },
  'ElementSelected': function () {
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);

    // handle play latest or pick episode actions
    console.log('ElementSelected -- ', this.event.request)
    var intentSlot,intentName;
    if (this.event.request.token === 'ReplayExplainer') {
      intentName = this.event.request.token;
    }  else if (this.event.request.token === 'Resume') {
      intentName = `AMAZON.${this.event.request.token}Intent`;
    }
    this.emitWithState(intentName);
  },

  'ReplayExplainer': function () {
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    console.log('REPLAY exp in exp during ep', this.handler.state)
    this.emitWithState('PickItem', {index: {value: this.attributes.currentExplainerIndex + 1}})
  },

  // built in STATE TRANSITION
  'AMAZON.ResumeIntent' : function() {
    console.log('RESume playing EXPLAINER during ep, should resume play STATE')
    delete this.attributes.IN_PROGRESS_EP
    this.handler.state = this.attributes.STATE = config.states.PLAYING_EPISODE;
    var confirmationMessage = `Okay I'll resume.`;
    audioPlayer.resume.call(this, confirmationMessage);
  },
  'AMAZON.CancelIntent' : function() {
    console.log(' EXPLAINER during ep STATE')
    // This needs to work for not playing as well
    this.response.speak('See you later. Say alexa, Make Me Smart to get learning again.')
    this.emit(':saveState');
  },
  // DEFAULT
  'SessionEndedRequest' : function () {
    console.log("session ended  EXPLAINER  durin ep", JSON.stringify(this.event.request, null,2));
  },
  'Unhandled' : function () {
     console.log('EXPLAINER during ep UNHANDLED',JSON.stringify(this.event, null, 2))
     if (this.event.context.AudioPlayer) {
       console.log('we screwed, audio in playing explainer while listenign to ep')
     }
     this.handler.state = this.attributes.STATE = config.states.START;
     this.emitWithState('LaunchRequest', 'no_welcome', "Sorry I couldn't quite handle that.");
   }

});
