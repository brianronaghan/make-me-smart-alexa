var Alexa = require('alexa-sdk');

var config = require('../config');
var util = require('../util');
var feeds = config.feeds;

var feedHelper = require('../feedHelpers');
var feedLoader = feedHelper.feedLoader;

var audioPlayer = require('../audioPlayer');

module.exports = Alexa.CreateStateHandler(config.states.PLAYING_EPISODE, {
  'PlayLatestEpisode' : function (slot) {

    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);

    var slot = slot || this.event.request.intent.slots;
    console.log("PLAYING EPISODE, PLAY LATEST", slot)
    if (slot && slot.show && slot.show.value) {
      this.attributes.show = slot.show.value;
    }
    var show = this.attributes.show || 'Make Me Smart';
    var chosenShow = util.itemPicker(show, feeds, 'feed', 'feed');
    var showImage = util.cardImage(chosenShow.image);
    var message = `Let me find the latest episode of ${chosenShow.feed}`;

    feedLoader.call(this, chosenShow, message, function(err, feedData) {
      console.log('PLAY LATEST feed load cb')
      var chosenEp = feedData.items[0];
      this.response.speak(`Playing the latest ${chosenShow.feed}, titled ${chosenEp.title}`);
      audioPlayer.start.call(this, chosenEp, 'episode', chosenShow.feed);
    });
  },
  // STATE TRANSITIONS
  'ListShows' : function () {
    this.handler.state = this.attributes.STATE = config.states.ITERATING_SHOW;
    this.emitWithState('ListShows');
  },
  'HomePage' : function () {
    this.handler.state = this.attributes.STATE = config.states.START;
    this.emitWithState('LaunchRequest', 'no_welcome');
  },
  'ListEpisodes' : function () {
    this.handler.state = this.attributes.STATE = config.states.ITERATING_EPISODE;
    this.emitWithState('ListEpisodes');
  },
  'LaunchRequest' : function () {
    console.log('LAUNCH REQUEST from playing ep', this.attributes.playing)
    if (this.attributes.playing && this.attributes.playing.finished) {
      this.emitWithState('AMAZON.NextIntent')
    } else {
      var intro = `Welcome back to Make Me Smart. Last time you were listening to a ${this.attributes.playing.feed} episode titled ${this.attributes.playing.title}. Say 'resume' to continue or 'what's new' to hear our latest explainers.`;
      var links = "<action value='Resume'>Resume Episode</action> | <action value='HomePage'>What's New</action>";

      if (this.event.context.System.device.supportedInterfaces.Display) {
        this.response.renderTemplate(util.templateBodyTemplate1('Welcome back to Make Me Smart', intro, links, config.background.show));
      }
      this.response.speak(intro).listen("Say 'resume', or 'what's new' to see what we're getting smart about lately.");

      this.emit(':saveState', true);

    }
    // this.emitWithState('LaunchRequest', 'no_welcome');
  },
  'PickItem' : function () {  // pick item in playing
    var slot = this.event.request.intent.slots;
    console.log("PICK ITEM IN PLAYING EP ", slot);
    if (slot.query && slot.query.value) {
      if (this.attributes.playing.status === 'playing' || this.attributes.playing.status === 'stopped') {
        this.handler.state = this.attributes.STATE = config.states.REQUEST;

        audioPlayer.stop.call(this, function () {
          console.log("AND NOW PICKING ITEM;");
          this.attributes.IN_PROGRESS_EP = true;
          this.emitWithState('PickItem', slot);
        });
      } else {
        this.handler.state = this.attributes.STATE = config.states.REQUEST;
        console.log('HAD PREVIOUSLY PAUsed')
        this.emitWithState('PickItem', slot);
      }

    } else if (slot.topic && slot.topic.value) {
      audioPlayer.stop.call(this, function () {
        this.handler.state = this.attributes.STATE = config.states.EXPLAINER_DURING_EPISODE;
        this.attributes.IN_PROGRESS_EP = true;
        this.emitWithState('PickItem', slot);
      });
    }

  },

  // TOUCH
  'ElementSelected': function () {
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);

    // handle play latest or pick episode actions
    console.log('ElementSelected -- ', this.event.request)
    var intentSlot,intentName;
    if (this.event.request.token === 'PlayLatestEpisode' || this.event.request.token === 'ListEpisodes') {
      intentName = this.event.request.token;
      intentSlot = {
        index: {
          value: this.attributes.show
        }
      }
    } else if (this.event.request.token === 'Next' || this.event.request.token === 'Previous' || this.event.request.token === 'Resume') {
      intentName = `AMAZON.${this.event.request.token}Intent`;
    } else if (this.event.request.token === 'ListShows') {
      intentName = this.event.request.token;
    } else {
      var tokenData = this.event.request.token.split('_');
      intentName = tokenData[0];
      intentSlot = {
        index: {
          value: parseInt(tokenData[1]) + 1
        }
      }
    }
    console.log('PLAYING EP touch',intentName, intentSlot);
    this.emitWithState(intentName, intentSlot);
  },

  // BUILT IN
  'AMAZON.ResumeIntent' : function () {
    console.log('buit in RESUME');
    audioPlayer.resume.call(this);
  },

  'AMAZON.StopIntent' : function() {
    console.log('built in STOP')
    // This needs to work for not playing as well
    audioPlayer.stop.call(this);
  },
  'AMAZON.CancelIntent' : function() {
    console.log('built in STOP')
    // This needs to work for not playing as well
    audioPlayer.stop.call(this);
  },

  'AMAZON.PauseIntent' : function () {
      this.response.speak(`Stopping. Say resume to continue episode ${this.attributes.playing.title}`);
      audioPlayer.stop.call(this);
  },
  'AMAZON.NextIntent' : function () {
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    console.log('NEXT called, PLAYING ->', this.attributes.playing)
    // if we're iterating something, move next
    if (this.attributes.playing) {
      console.log('we are playing', this.attributes.playing.type)
      var chosenShow;
      if (this.attributes.playing.type === 'episode') {
        chosenShow = util.itemPicker(this.attributes.playing.feed, feeds, 'feed', 'feed');
      }
      var boundThis = this;
      feedLoader.call(boundThis, chosenShow, false, function(err, feedData) {
        var nextEp = util.nextPicker(boundThis.attributes.playing, 'token', feedData.items, 'guid');
        if (nextEp === -1) {
          console.log('handle no next')
          this.handler.state = this.attributes.STATE = config.states.START;
          var message = `You've gotten to end of ${feedData.feed}. `;
          // what happens? Should I give a message along the lines of: that's the end?
          util.sendProgressive(
            boundThis.event.context.System.apiEndpoint, // no need to add directives params
            boundThis.event.request.requestId,
            boundThis.event.context.System.apiAccessToken,
            message,
            function (err) {
              console.log('progressive cb',err)
              if (err) {
                return boundThis.emitWithState('LaunchRequest', 'finished_playing', message);
              } else {
                return boundThis.emitWithState('LaunchRequest', 'finished_playing');
              }
            }
          );
        } else {
          var nextSpeech = 'Okay. '
          switch(this.attributes.playing.status) {
            case 'playing':
              nextSpeech += `Skipping to the next ${boundThis.attributes.playing.feed}, titled ${nextEp.title}.`;
              break;
            case 'finished':
              nextSpeech += `Last time you finished hearing ${boundThis.attributes.playing.title}. I'll play the next ${boundThis.attributes.playing.type}.`;
              break;
            default:
              nextSpeech += `Playing the next ${boundThis.attributes.playing.feed}, titled ${nextEp.title}.`;
              break;
          }
          this.response.speak(nextSpeech);
          audioPlayer.start.call(this, nextEp, boundThis.attributes.playing.type, chosenShow.feed);
        }
      });
    } else {
      this.handler.state = this.attributes.STATE = config.states.START;
      this.emitWithState('LaunchRequest');
    }
  },
  'AMAZON.PreviousIntent' : function () {
    var deviceId = util.getDeviceId.call(this);
    util.nullCheck.call(this, deviceId);
    var chosenShow;
    if (this.attributes.playing && this.attributes.playing.type === 'episode') {

      chosenShow = util.itemPicker(this.attributes.playing.feed, feeds, 'feed', 'feed');
      var boundThis = this;
      feedLoader.call(boundThis, chosenShow, false, function(err, feedData) {
        var prevEp = util.prevPicker(boundThis.attributes.playing, 'token', feedData.items, 'guid');
        if (prevEp === -1) {
          console.log("FUCK PREVIOUS", this.attributes.playing);
          var message = `There is no newer episode of ${chosenShow.feed}. `;
          if (this.attributes.playing.status === 'playing' || this.attributes.playing.status === 'stopped') {
            message += `Say 'resume' to continue the episode titled ${this.attributes.playing.title}, or say 'what's new' to explore our latest explainers.`;
            if (this.event.context.System.device.supportedInterfaces.Display) {
              this.response.renderTemplate(util.templateBodyTemplate1(this.attributes.playing.title, message, '', config.background.show));
            }
            audioPlayer.stop.call(this, function () {
              this.response.speak(message).listen("Say 'resume' or 'what's new.'");
              this.emit(':responseReady');
            }); // TODO: make it actually stop

          } else {
            return util.sendProgressive(
              boundThis.event.context.System.apiEndpoint, // no need to add directives params
              boundThis.event.request.requestId,
              boundThis.event.context.System.apiAccessToken,
              message,
              function (err) {
                console.log('progressive cb',err)
                if (err) {
                  return boundThis.emitWithState('LaunchRequest', 'finished_playing', message);
                } else {
                  return boundThis.emitWithState('LaunchRequest', 'finished_playing');
                }
              }
            );
          }
        } else {
          var prevSpeech = 'Okay. '
          switch(this.attributes.playing.status) {
            case 'playing':
              prevSpeech += `Playing the previous ${boundThis.attributes.playing.feed}, titled ${prevEp.title}.`;
              break;
            case 'finished':
              prevSpeech += `Last time you finished hearing ${boundThis.attributes.playing.title}. I'll play the previous ${boundThis.attributes.playing.type}.`;
              break;
            default:
              prevSpeech += `Playing the previous ${boundThis.attributes.playing.feed}, titled ${prevEp.title}.`;
              break;
          }
          this.response.speak(prevSpeech);
          audioPlayer.start.call(this, prevEp, boundThis.attributes.playing.type, chosenShow.feed);
        }
      });
    } else {
      this.handler.state = this.attributes.STATE = config.states.START;
      this.emitWithState('LaunchRequest');
    }
  },



  // DEFAULT
  'AMAZON.HelpIntent' : function () {
    console.log('Help in PLAYING EPISODE')
    var message = "You can say 'list shows' or 'list episodes', or 'what's new' to see the latest explainers.";
    this.response.speak(message).listen(message);
    if (this.event.context.System.device.supportedInterfaces.Display) {
      var links = "<action value='ListShows'>List Shows</action> | <action value='ListEpisodes'>List Episodes</action> | <action value='HomePage'>What's New</action>";
      this.response.renderTemplate(util.templateBodyTemplate1('Make Me Smart Help', message, links, config.background.show));
    }
    this.emit(':saveState', true);
  },

  'SessionEndedRequest' : function () {
    console.log("SESSION ENDED  PLAYING EP ")
   },
   'Unhandled' : function () {
     console.log('unhandled - PLAYING EPISODE ',JSON.stringify(this.event, null, 2))
     this.handler.state = this.attributes.STATE = config.states.START;
     this.emitWithState('LaunchRequest', 'no_welcome', "Sorry I couldn't quite handle that.");
   }

});
