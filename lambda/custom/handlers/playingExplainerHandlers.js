'use strict';

var Alexa = require('alexa-sdk');

var config = require('../config');
var util = require('../util');

var explainers = require('../explainers');

var dynasty = require('dynasty')({ region: process.env.AWS_DEFAULT_REGION });
var sessions = dynasty.table(config.sessionDBName);

var db = require('../db');

module.exports = Alexa.CreateStateHandler(config.states.PLAYING_EXPLAINER, {
  'LaunchRequest': function () {

    var deviceId = util.getDeviceId.call(this);
    var intro = `Welcome back to Make Me Smart. `;
    util.nullCheck.call(this, deviceId);

    console.log('LAUNCH IN EXPLAINER STATE');
    // console.log('handler state', this.handler.state, ' atty state', this.attributes.STATE)
    if (!this.attributes.currentExplainerIndex || this.attributes.currentExplainerIndex === -1) {
      console.log('no explainer index SWITCHING state');
      this.handler.state = this.attributes.STATE = config.states.START;
      return this.emitWithState('LaunchRequest')
    }
    var previousExplainer = explainers[this.attributes.currentExplainerIndex];

    intro += `Last time you were learning about ${previousExplainer.title}. Say 'restart' to hear that again or 'what's new' to hear the latest explainers.`;
    // On add the and that was to the speech... not for card'
    var links = "<action value='PlayLatestExplainer'>Play All</action>";
    this.response.speak(intro).listen("Say 'restart', or say 'what's new' to hear the latest explainers.");
    if (this.event.context.System.device.supportedInterfaces.Display) {
      this.response.renderTemplate(util.templateBodyTemplate1('Welcome to Make Me Smart', intro, links, config.background.show));
    }
    this.emit(':saveState', true);

  },
  'HomePage': function () {
    // why did what's new not go here?
    this.attributes.currentExplainerIndex = -1;
    this.handler.state = this.attributes.STATE = config.states.START;
    return this.emitWithState('LaunchRequest', 'no_welcome')
  },

  'PickItem': function (slot, source) {
    console.log("WHAT'S MY SOURCE", slot, source)
    // set spot in indices
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    var slot = slot || this.event.request.intent.slots;
    var boundThis = this;
    var chosenExplainer = util.itemPicker(slot, explainers, 'title', 'topic');
    if (!chosenExplainer) {
      if (slot.query && slot.query.value) {
        console.log("NO EXPLAINER , but there is QUERY ", JSON.stringify(slot, null,2));
        this.handler.state = config.states.REQUEST;
        this.attributes.STATE = config.states.REQUEST;
        return this.emitWithState('PickItem', slot);
      } else if (slot.index && slot.index.value) {
        console.log("NO EXPLAINER , but there is INDEX ", JSON.stringify(slot, null,2))
        var message = `${slot.index.value} is not a valid choice. Please choose between 1 and ${explainers.length}. I'll list the explainers again.`
        var boundThis = this;
        return util.sendProgressive(
          boundThis.event.context.System.apiEndpoint, // no need to add directives params
          boundThis.event.request.requestId,
          boundThis.event.context.System.apiAccessToken,
          message,
          function (err) {
            boundThis.handler.state = boundThis.attributes.STATE = config.states.ITERATING_EXPLAINER;
            boundThis.emitWithState('ListExplainers');
          }
        );
      } else if (slot.ordinal && slot.ordinal.value) {
        console.log("NO EXPLAINER , but there is ORDINAL ", JSON.stringify(slot, null,2))

        var message = `We don't have a ${slot.ordinal.value}. Please choose between 1 and ${explainers.length}. I'll list the explainers again.`
        return util.sendProgressive(
          boundThis.event.context.System.apiEndpoint, // no need to add directives params
          boundThis.event.request.requestId,
          boundThis.event.context.System.apiAccessToken,
          message,
          function (err) {
            boundThis.handler.state = boundThis.attributes.STATE = config.states.ITERATING_EXPLAINER;
            boundThis.emitWithState('ListExplainers');
          }
        );
      } else if (slot.wildcard && slot.wildcard.value) {
        console.log("NO EXPLAINER , but there is WILDCARD ", JSON.stringify(slot, null,2));
        this.handler.state = config.states.REQUEST;
        this.attributes.STATE = config.states.REQUEST;
        return this.emitWithState('PickItem', slot);
      } else {
        console.log("NO EXPLAINER, and no slot info I can use ", JSON.stringify(slot, null,2));
        var message = `Sorry, I couldn't quite understand that. Here are our latest explainers.`;
        return util.sendProgressive(
          boundThis.event.context.System.apiEndpoint, // no need to add directives params
          boundThis.event.request.requestId,
          boundThis.event.context.System.apiAccessToken,
          message,
          function (err) {
            this.handler.state = this.attributes.STATE = config.states.START;
            return this.emitWithState('LaunchRequest', 'no_welcome')
          }
        );
      }
    } else {
      console.time('UPDATE-DB');
      var payload = {};
      console.log('source');
      payload.explainers = [{
        source: source || 'EXTERNAL',
        guid: chosenExplainer.guid,
        timestamp: this.event.request.timestamp,
      }]
      db.update.call(this, payload, function(err, resp) {
        console.timeEnd('UPDATE-DB');
        this.attributes.currentExplainerIndex = chosenExplainer.index;
        util.logExplainer.call(this, chosenExplainer);
        var author = chosenExplainer.author;
        if (author === 'Molly Wood') {
          author = `Molly '<emphasis level="strong"> Wood</emphasis>`;
        }
        var intro = `Here's ${author} explaining ${chosenExplainer.title}. <break time = "500ms"/> <audio src="${chosenExplainer.audio.url}" /> `; // <break time = "200ms"/>
        var prompt;
        var links = "<action value='ReplayExplainer'>Replay</action> | <action value='ListExplainers'>List Explainers</action>";
        if (this.event.session.new) {
          prompt = `Say 'replay' to hear that again, 'list explainers' to see all of our explainers, or 'what's new' to explore our latest explainers.`;
          links += " | <action value='HomePage'> What's New </action>";
        } else if (explainers[chosenExplainer.index+1]) { // handle if end of explainer feed
          prompt = `Say 'replay' to hear that again, 'next' to learn about ${explainers[chosenExplainer.index+1].title}, or 'list explainers' to see all of our explainers.`;
          links += " | <action value='Next'>Next</action>";
        } else {
          prompt = "And that's all we have right now. Say 'replay' to hear that again, 'list explainers' to see all, or 'suggest a topic' to give us an idea for our next explainer."
          links += " | <action value='RequestExplainer'>Suggest a topic</action>";
        }

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
        this.response.speak(fullSpeech).listen(prompt); // if i do listen, you can't request an explainer during
        this.emit(':saveState', true);
      });

    }
  },
  'PlayLatestExplainer': function () {
    // this is what 'play all would do'
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    this.emitWithState('PickItem', {index: {value: 1}}, 'PLAY_THE_LATEST');
  },
  'ReplayExplainer': function () {
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    console.log('GOT REPLAY', this.handler.state)
    // currentExplainerIndex is 0 based, and PickItem expects 1-based
    this.emitWithState('PickItem', {index: {value: this.attributes.currentExplainerIndex + 1}}, 'REPLAY')
  },
  // STATE TRANSITION:
  'RequestExplainer' : function () {
    console.log('request explainer test')
    this.handler.state = this.attributes.STATE = config.states.REQUEST;
    this.emitWithState('RequestExplainer');
  },
  'ListExplainers': function () {
    console.log('list explainers from play explain')

    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    console.log('list Explainers FROM Playing explainers')
    console.log(JSON.stringify(this.event.request, null, 2));
    this.attributes.currentExplainerIndex = -1;
    this.attributes.indices.explainer = 0;
    this.handler.state = this.attributes.STATE = config.states.ITERATING_EXPLAINER;
    // this just throws to the correct state version of itself
    this.emitWithState('ListExplainers');
  },
  'ListEpisodes' : function () {
    this.attributes.currentExplainerIndex = -1;
    this.attributes.indices.explainer = 0;
    this.handler.state = this.attributes.STATE = config.states.ITERATING_EPISODE;
    console.log('LIST EPISODES from PLAY EXP')
    this.emitWithState('ListEpisodes');
  },


  // TOUCH EVENTS:
  'ElementSelected': function () {
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);

    // handle play latest or pick episode actions
    console.log('ElementSelected -- ', this.event.request)
    var intentSlot,intentName;
    if (this.event.request.token === 'PlayLatestExplainer' || this.event.request.token === 'ListExplainers') {
      intentName = this.event.request.token;
    }  else if (this.event.request.token === 'Next' || this.event.request.token === 'Previous') {
      intentName = `AMAZON.${this.event.request.token}Intent`;
    } else {
      var tokenData = this.event.request.token.split('_');
      intentName = tokenData[0];
      intentSlot = {
        index: {
          value: parseInt(tokenData[1]) + 1
        }
      }
    }
    console.log('PLAYING EXPLAINERS, TOUCH', intentName, intentSlot);
    this.emitWithState(intentName, intentSlot, 'TOUCH_LIST_EXPLAINERS');
  },

  // BUILT INS:
  'AMAZON.NextIntent' : function () {
    // only in explainer mode, right?
    console.log("NEXT!!!! EXPLAINER", this.handler.state)
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    // handle next at end of list?
    if (explainers.length <= this.attributes.currentExplainerIndex +1) {
      // last spot
      var message = "We don't have any more explainers right now. Say 'list explainers' to see all or 'play full episodes' to hear episodes of our shows."
      var prompt = "Say 'list explainers' to see all, or 'play full episodes' to for full episodes of our show."
      var links = "<action value='ListExplainers'>List explainers</action> | <action value='ListShows'>Play full episodes</action>";

      if (this.event.context.System.device.supportedInterfaces.Display) {
        this.response.renderTemplate(
          util.templateBodyTemplate3(
            "Make Me Smart",
            config.icon.full,
            "We don't have any more explainers right now.",
            links,
            config.background.show
          )
        );
      }
      this.response.speak(message).listen(prompt);
      this.emit(':saveState');

    } else {
      // currentExplainerIndex is 0 based, and PickItem expects 1-based
      return this.emitWithState('PickItem', {index: {value: this.attributes.currentExplainerIndex+2}}, 'NEXT_PLAY');

    }
  },
  'AMAZON.PreviousIntent' : function () {
    // only in playing explainer mode, right?
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    // currentExplainerIndex is 0-indexed, and PickItem expects 1-indexed (b/c user input)
    this.emitWithState('PickItem', {index: {value: this.attributes.currentExplainerIndex}});


  },
  'AMAZON.StopIntent' : function() {
    console.log('STOP EXPLAINER STATE')
    // This needs to work for not playing as well
    // SHOULD I CLEAR THE STATE?

    this.response.speak('See you later. Say alexa, Make Me Smart to get learning again.')
    this.emit(':saveState');
  },
  'AMAZON.ResumeIntent' : function() {
    console.log('RESume playing EXPLAINER STATE')
    // This needs to work for not playing as well
    this.emitWithState('LaunchRequest');
  },
  'AMAZON.CancelIntent' : function() {
    console.log('CANCEL PLAY EXPLAINER STATE')
    // This needs to work for not playing as well
    // SHOULD I CLEAR THE STATE?
    this.response.speak('See you later. Say Alexa, Make Me Smart to get learning again.')
    this.emit(':saveState');
  },

  'AMAZON.PauseIntent' : function() {
    console.log('PAUSE EXPLAINER STATE')
    // This needs to work for not playing as well
    this.response.speak('See you later. Say alexa, Make Me Smart to get learning again.')
    this.emit(':saveState');
  },

  // DEFAULT:
  'AMAZON.HelpIntent' : function () {
    console.log('Help in PLAYING EXPLAINER')
    var message = "You can say 'next' or 'previous', or 'what's new' to see our latest explainers, or 'list explainers' to see them all.";
    this.response.speak(message).listen(message);
    if (this.event.context.System.device.supportedInterfaces.Display) {
      var links = "<action value='HomePage'>What's New</action> | <action value='ListExplainers'>List Explainers</action>";
      this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Help', message, links, config.background.show));
    }
    this.emit(':saveState', true);
  },
  'SessionEndedRequest' : function () {
    // SHOULD I CLEAR THE STATE?

    console.log("PLAYING EXPLAINER session end", JSON.stringify(this.event.request, null,2));
    this.response.speak('See you later. Say Alexa, Make Me Smart to get learning again.')
    this.emit(':saveState');
   },
   'Unhandled' : function () {
     console.log('PLAYING EXPLAINER UNHANDLED',JSON.stringify(this.event, null, 2))
     this.handler.state = this.attributes.STATE = config.states.START;
     this.emitWithState('LaunchRequest', 'no_welcome', "Sorry I couldn't quite handle that.");

   }

});
