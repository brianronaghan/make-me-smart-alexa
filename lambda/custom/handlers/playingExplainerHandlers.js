'use strict';

var Alexa = require('alexa-sdk');

var config = require('../config');
var util = require('../util');

var dynasty = require('dynasty')({ region: process.env.AWS_DEFAULT_REGION });
var sessions = dynasty.table(config.sessionDBName);

var db = require('../db');

module.exports = Alexa.CreateStateHandler(config.states.PLAYING_EXPLAINER, {
  'LaunchRequest': function () {
    delete this.attributes.EASTER_EGG_TITLE;
    console.log("PLAYING LaunchRequest ", this.handler.state)
    this.handler.state = this.attributes.STATE = config.states.START;
    this.emitWithState('LaunchRequest');
  },

  'PickItem': function (slot, source) {
    console.log(`PLAYING_EXPLAINER, PickItem slot `, JSON.stringify(this.event.request.intent, null,2))

    // set spot in indices
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);

    util.asyncExplainers.call(this, function(err, resp) {
      if(err) {
        console.log("ASYNC EXPLAINER ERR", err);
      }
      var allExplainers = resp;

      var slot = slot || this.event.request.intent.slots;
      var boundThis = this;
      let addOneBool = false;
      if (source === 'HOME_AFTER_LAUNCH') {
        addOneBool = true
      }
      var chosenExplainer = util.itemPicker(slot, allExplainers, 'title', 'topic', addOneBool);
      if (chosenExplainer === -1) {
        var theNumber;
        if (slot.query && slot.query.value) {
          theNumber = util.stripActions(slot.query.value);
          delete slot.query.value;
        } else if (slot.index && slot.index.value) {
          theNumber = util.stripActions(slot.index.value);
          delete slot.index.value;
        } else if (slot.ordinal && slot.ordinal.value) {
          theNumber = util.stripActions(slot.ordinal.value);
          delete slot.ordinal.value;
        }
        var message = `${theNumber} is not a valid choice. Please choose between 1 and 99. Let's try again. `
        var boundThis = this;
        return util.sendProgressive(
          boundThis.event.context.System.apiEndpoint, // no need to add directives params
          boundThis.event.request.requestId,
          boundThis.event.context.System.apiAccessToken,
          message,
          function (err) {
            boundThis.handler.state = boundThis.attributes.STATE = config.states.ITERATING_EXPLAINER;
            boundThis.emitWithState('ListExplainers', 'invalid_number');
          }
        );

      } else if (!chosenExplainer) {
        if (slot.query && slot.query.value) {
          let intentCheck = util.intentCheck(slot.query.value);
          let externalCheck = util.externalCheck(slot.query.value);
          if (externalCheck) {
            this.attributes.EXTERNALS = this.attributes.EXTERNALS || 0;
            this.attributes.EXTERNALS++;
            if (this.attributes.EXTERNALS === 1 || (this.attributes.EXTERNALS % config.externalMessageFrequency === 0)) {
              return this.emitWithState('AMAZON.StopIntent', config.externalMessage);
            } else {
              return this.emitWithState('AMAZON.CancelIntent');
            }
          } else if (intentCheck) {
            console.log("Playing Explainer PickItem intentCheck -- slot.query.value ", slot.query.value)
            delete slot.query.value;
            return this.emitWithState(intentCheck);
          }
          console.log("PLAYING_EXPLAINER, PickItem - slot.query.value but could not find -- SENDING TO UNRESOLVED");
          this.handler.state = this.attributes.STATE = config.states.UNRESOLVED;
          return this.emitWithState('PickItem');
        } else if (slot.index && slot.index.value) {
          console.log("NO EXPLAINER FOUND, but there is INDEX ", JSON.stringify(slot, null,2))
          var message = `${slot.index.value} is not a valid choice. Please choose between 1 and 99. Let's try again. `
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
          let theOrdinal = slot.ordinal.value;
          delete slot.ordinal.value;
          var message = `We don't have a ${theOrdinal}. Please choose between 1 and 99. Let's try again. `
          return util.sendProgressive(
            boundThis.event.context.System.apiEndpoint, // no need to add directives params
            boundThis.event.request.requestId,
            boundThis.event.context.System.apiAccessToken,
            message,
            function (err) {
              boundThis.handler.state = boundThis.attributes.STATE = config.states.ITERATING_EXPLAINER;
              boundThis.emitWithState('ListExplainers', 'invalid_number');
            }
          );
        } else if (slot.topic && slot.topic.value) {
          // convert to query?
          console.log("PLAYING_EXPLAINER, PickItem - slot.topic.value but could not find -- SENDING TO UNRESOLVED");
          this.handler.state = this.attributes.STATE = config.states.UNRESOLVED;
          return this.emitWithState('PickItem', slot);
        } else {
          console.log("NO EXPLAINER, and no slot info I can use ", JSON.stringify(slot, null,2));
          var message = `Sorry, I couldn't quite understand that.`;
          return util.sendProgressive(
            boundThis.event.context.System.apiEndpoint, // no need to add directives params
            boundThis.event.request.requestId,
            boundThis.event.context.System.apiAccessToken,
            message,
            function (err) {
              return boundThis.emitWithState('HomePage', 'no_welcome')
            }
          );
        }
      } else {
        // IF it's EASTER EGG:
        if (chosenExplainer.EE) {
          // set THIS.EASTER_EGG to true
          // set index to 0 just incase
          this.attributes.EASTER_EGG_TITLE = chosenExplainer.title.toLowerCase();
        }
        console.time('PLAY-DB');
        var payload = {};
        payload.explainers = [{
          source: source || 'EXTERNAL',
          guid: chosenExplainer.guid,
          timestamp: this.event.request.timestamp,
        }]
        this.attributes.indices.explainer = 0; // if we're playing, might as well reset the list
        db.update.call(this, payload, function(err, resp) {
          console.timeEnd('PLAY-DB');
          this.attributes.currentExplainerIndex = chosenExplainer.index;
          util.logExplainer.call(this, chosenExplainer);
          var author = chosenExplainer.author;
          if (author === 'Molly Wood') {
            author = `Molly <emphasis level="strong"> Wood</emphasis>`;
          }
          console.log("SOURCE PICK ", source)
          var intro = ''
          if (this.event.session.new) {
            intro += 'Welcome to Make Me Smart! ';
          }
          if (source && source === 'NEW_USER_LAUNCH_PICK') {
            intro += `<audio src="${config.newUserAudio}" /> `;
          }
          if (chosenExplainer.EE) {
            intro += 'Congratulations, you found a secret easter egg. '
          }
          intro += `Here's ${author} explaining ${chosenExplainer.title}`;
          if (chosenExplainer.requestInformation && chosenExplainer.requestInformation.user) {
            intro += `, as requested by ${chosenExplainer.requestInformation.user}`;
            if (chosenExplainer.requestInformation.location) {
              intro += ` from ${chosenExplainer.requestInformation.location}`
            }
          }
          intro += `. <break time = "200ms"/> <audio src="${chosenExplainer.audio.url}" />`;
          var prompt;
          if (chosenExplainer.EE) {
            prompt = `Thanks for listening! By the way, do us a favor and rate Make Me Smart on the Alexa Skill Store or Mobile App. You can hear what's new, browse all our explainers or submit an idea. What would you like to do?`;
          } else if (this.event.session.new) { // came directly here
            prompt = `You can replay the explainer, play the latest, or browse all our explainers. What would you like to do?`;
          } else if (allExplainers[chosenExplainer.index+1]) { // THERE IS a next explainer
            prompt = `You can replay the explainer, say 'next' to hear another, or browse all our explainers. What would you like to do?`;
          } else { // end of the line
            prompt = "And that's all we have right now. You can replay the explainer, browse all our explainers, or submit an idea for our next one. What would you like to do?"
          }
          let displayMessage;
          if (chosenExplainer.EE) {
            displayMessage = "Congrats! You found an easter egg! Thanks for being a power user! Do us a favor and rate Make Me Smart on the Alexa Skill Store or Mobile App!";
          } else {
            displayMessage = util.displayMessage.call(this);

          }
          if (this.event.context.System.device.supportedInterfaces.Display) {
            this.response.renderTemplate(
              util.templateBodyTemplate3(
                chosenExplainer.title,
                util.imageForExplainer(chosenExplainer),
                '',
                displayMessage,
                config.background.show
              )
            );
          }
          var fullSpeech = intro + prompt;
          this.response.speak(fullSpeech).listen(prompt);
          this.emit(':saveState', true);
        });

      }
    }) // close async explainer call

    // end of function
  },
  'PlayLatestExplainer': function () {
    delete this.attributes.EASTER_EGG_TITLE
    // this is what 'play all would do'
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);

    this.emitWithState('PickItem', {index: {value: 1}}, 'LATEST_FROM_PLAY');
  },
  'ReplayExplainer': function () {
    if (this.attributes.EASTER_EGG_TITLE) {
      return this.emitWithState('PickItem', {query: {value: this.attributes.EASTER_EGG_TITLE}}, 'REPLAY')
    }
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    console.log('GOT REPLAY', this.handler.state)
    // currentExplainerIndex is 0 based, and PickItem expects 1-based
    this.emitWithState('PickItem', {index: {value: this.attributes.currentExplainerIndex + 1}}, 'REPLAY')
  },
  'RepeatOptions': function () {
    if (this.attributes.EASTER_EGG_TITLE) {
      return this.emitWithState('PickItem', {query: {value: this.attributes.EASTER_EGG_TITLE}}, 'REPLAY')
    }
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    console.log('GOT REPEAT', this.handler.state)
    // currentExplainerIndex is 0 based, and PickItem expects 1-based
    this.emitWithState('PickItem', {index: {value: this.attributes.currentExplainerIndex + 1}}, 'REPLAY')
  },
  // STATE TRANSITION:
  'RequestExplainer' : function () {
    console.log('request explainer test IN PLAYING')
    delete this.attributes.EASTER_EGG_TITLE;
    this.handler.state = this.attributes.STATE = config.states.REQUEST;
    this.emitWithState('RequestExplainer', {query: {value:null},userLocation: {value: null}, userName: {value: null}});
  },
  'ListExplainers': function () {
    delete this.attributes.EASTER_EGG_TITLE
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    console.log('list Explainers FROM Playing explainers')
    this.attributes.currentExplainerIndex = -1;
    this.attributes.indices.explainer = 0;
    this.handler.state = this.attributes.STATE = config.states.ITERATING_EXPLAINER;
    // this just throws to the correct state version of itself
    this.emitWithState('ListExplainers');
  },

  'NewerExplainers' : function () {
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    var slot = slot || this.event.request.intent.slots;

    console.log("NEWER EXPLAINERS from playing", this.attributes.indices.explainer)

    delete this.attributes.EASTER_EGG_TITLE;
    this.handler.state = this.attributes.STATE = config.states.ITERATING_EXPLAINER;
    if (slot.query && slot.query.value) {
      delete slot.query.value;
    }
    return this.emitWithState('NewerExplainers');
  },
  'OlderExplainers' : function () {
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    var slot = slot || this.event.request.intent.slots;
    console.log("OLDER EXPLAINERS from playing", this.attributes.indices.explainer)
    delete this.attributes.EASTER_EGG_TITLE;
    this.handler.state = this.attributes.STATE = config.states.ITERATING_EXPLAINER;
    if (slot.query && slot.query.value) {
      delete slot.query.value;
    }
    return this.emitWithState('OlderExplainers');

  },
  'HomePage' : function () {
    delete this.attributes.EASTER_EGG_TITLE;
    this.handler.state = this.attributes.STATE = config.states.HOME_PAGE;
    this.emitWithState('HomePage', 'no_welcome');
  },


  // BUILT INS:
  'AMAZON.NextIntent' : function () {
    if (this.attributes.EASTER_EGG_TITLE) {
      let message = "If you could use next to hear more easter eggs, they wouldn't be easter eggs. Instead, ";
      let prompt = "You can hear what's new, browse all our explainers or submit an idea. What would you like to do?"
      if (this.event.context.System.device.supportedInterfaces.Display) {
        this.response.renderTemplate(
          util.templateBodyTemplate3(
            "Make Me Smart",
            config.icon.full,
            "You can't use next when hearing an easter egg.",
            "Instead: you can hear what's new, browse all our explainers or submit an idea.",
            config.background.show
          )
        );
      }
      this.response.speak(message + prompt).listen(prompt);
      this.emit(':saveState');
    }
    delete this.attributes.EASTER_EGG_TITLE;

    // only in explainer mode, right?
    console.log("NEXT!!!! EXPLAINER", this.handler.state)
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    if (100 <= this.attributes.currentExplainerIndex +1) {
      // last spot
      var message = "We don't have any more explainers right now. You can browse all our explainers or hear what's new for the latest. What would you like to do?"
      var prompt = "You can browse all our explainers or hear what's new for the latest. What would you like to do?"

      if (this.event.context.System.device.supportedInterfaces.Display) {
        this.response.renderTemplate(
          util.templateBodyTemplate3(
            "Make Me Smart",
            config.icon.full,
            "We don't have any more explainers right now.",
            "You can browse all our explainers or hear what's new for the latest.",
            config.background.show
          )
        );
      }
      this.response.speak(message).listen(prompt);
      this.emit(':saveState');

    } else {
      // currentExplainerIndex is 0 based, and PickItem expects 1-based, thus +2 to add 1
      return this.emitWithState('PickItem', {index: {value: this.attributes.currentExplainerIndex+2}}, 'NEXT');

    }
  },
  'AMAZON.PreviousIntent' : function () {
    if (this.attributes.EASTER_EGG_TITLE) {
      let message = "If you could use previous to hear more easter eggs, they wouldn't be easter eggs. Instead, ";
      let prompt = "You can hear what's new, browse all our explainers or submit an idea. What would you like to do?"
      if (this.event.context.System.device.supportedInterfaces.Display) {
        this.response.renderTemplate(
          util.templateBodyTemplate3(
            "Make Me Smart",
            config.icon.full,
            "You can't use previous when hearing an easter egg.",
            "Instead, you can hear what's new, browse all our explainers or submit an idea.",
            config.background.show
          )
        );
      }
      this.response.speak(message + prompt).listen(prompt);
      this.emit(':saveState');
    }
    delete this.attributes.EASTER_EGG_TITLE;
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    if (this.attributes.currentExplainerIndex == 0) {
      var message = "You've heard our most recent explainer. There's no previous! You can browse all our explainers or say next. What would you like to do?"
      var prompt = "You can browse all our explainers or say next. What would you like to do?"

      if (this.event.context.System.device.supportedInterfaces.Display) {
        this.response.renderTemplate(
          util.templateBodyTemplate3(
            "Make Me Smart",
            config.icon.full,
            "You've reached the most recent explainer.",
            "You can browse all our explainers or hear what's new for the latest.",
            config.background.show
          )
        );
      }
      this.response.speak(message).listen(prompt);
      this.emit(':saveState');

    } else {
      // currentExplainerIndex is 0-indexed, and PickItem expects 1-indexed (it's user input) in the index slot, thus using the 0-based is the same as --
      this.emitWithState('PickItem', {index: {value: this.attributes.currentExplainerIndex}});

    }


  },
  'ChangeMyInfo' : function () {
    delete this.attributes.EASTER_EGG_TITLE;

    this.handler.state = this.attributes.STATE = config.states.REQUEST;
    this.emitWithState('ChangeMyInfo');
  },
  'AMAZON.StopIntent' : function(sentMessage) {
    delete this.attributes.EASTER_EGG_TITLE;

    console.log('STOP PLAY EXPLAINER STATE: ', this.attributes.plays)
    // This needs to work for not playing as well
    // SHOULD I CLEAR THE STATE?
    this.attributes.STOPS = this.attributes.STOPS || 0;
    this.attributes.STOPS++;
    if (sentMessage) {
      this.response.speak(sentMessage)
    } else if (this.attributes.STOPS === 1 || (this.attributes.STOPS % config.stopMessageFrequency === 0)) {
      this.response.speak(config.stopMessage)
    }
    this.emit(':saveState');
  },
  'AMAZON.CancelIntent' : function() {
    delete this.attributes.EASTER_EGG_TITLE;
    this.emit(':saveState');
  },

  'AMAZON.PauseIntent' : function() {
    delete this.attributes.EASTER_EGG_TITLE;

    console.log('PAUSE PLAY EXPLAINER STATE')
    // This needs to work for not playing as well
    this.response.speak('See you later. Say alexa, Make Me Smart to get learning again.')
    this.emit(':saveState');
  },

  // DEFAULT:
  'AMAZON.HelpIntent' : function () {
    delete this.attributes.EASTER_EGG_TITLE;

    console.log('Help in PLAYING EXPLAINER')
    var message = "You can say replay, next, or 'what's new' to hear our latest explainers. What would you like to do?";
    this.response.speak(message).listen(message);
    if (this.event.context.System.device.supportedInterfaces.Display) {
      this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Help', message, null, config.background.show));
    }
    this.emit(':saveState', true);
  },
  'SessionEndedRequest' : function () {
    // SHOULD I CLEAR THE STATE?
    delete this.attributes.EASTER_EGG_TITLE;

    console.log("PLAYING EXPLAINER session end", JSON.stringify(this.event.request, null,2));
    this.response.speak('See you later. Say Alexa, Make Me Smart to get learning again.')
    this.emit(':saveState');
   },
   'Unhandled' : function () {
     delete this.attributes.EASTER_EGG_TITLE;

     console.log("UNHANDLED playing", JSON.stringify(this.event, null, 2))
     var message = "Sorry I couldn't quite understand that. ";
     var prompt = "You can say replay, next, or 'what's new' to hear our latest explainers. What would you like to do?";
     this.response.speak(message + prompt).listen(prompt);
     if (this.event.context.System.device.supportedInterfaces.Display) {
       this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Help', message + prompt, null, config.background.show));
     }
     this.emit(':saveState', true);
   }

});
