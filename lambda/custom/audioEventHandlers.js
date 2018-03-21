'use strict';

var Alexa = require('alexa-sdk');
var config = require('./config');
var feeds = config.feeds;
var feedHelper = require('./feedHelpers');
var feedLoader = feedHelper.feedLoader;
var util = require('./util')
var audioPlayer = require('./audioPlayer');

var audioEventHandlers = Alexa.CreateStateHandler(config.states.PLAYING_EPISODE, {
    'PlaybackStarted' : function () {
        /*
         * AudioPlayer.PlaybackStarted Directive received.
         * Confirming that requested audio file began playing.
         * Storing details in dynamoDB using attributes.
         */

        // maybe check playing against enqueued? then put in playing and nuke enqueued?
        logPlay.call(this)
        this.emit(':saveState', true);
    },
    'PlaybackFinished' : function () {
        /*
         * AudioPlayer.PlaybackFinished Directive received.
         * Confirming that audio file completed playing.
         * Storing details in dynamoDB using attributes.
         */
         console.log("PlaybackFinished EVER")

        logFinished.call(this);

        this.emit(':saveState', true);

        // audioPlayer.stop.call(this);
        // should I... nuke the playing here?
        // this.emit('FinishedHandler');
    },
    'PlaybackStopped' : function () {
        /*
         * AudioPlayer.PlaybackStopped Directive received.
         * Confirming that audio file stopped playing.
         * Storing details in dynamoDB using attributes.
         */
        console.log("AUDIO EVENT PlaybackStopped ");
        logStop.call(this);
        this.emit(':saveState', true);
    },
    'PlaybackNearlyFinished' : function () {
        /*
         * AudioPlayer.PlaybackNearlyFinished Directive received.
         * Using this opportunity to enqueue the next audio
         * Storing details in dynamoDB using attributes.
         * Enqueuing the next audio file.
         */
         /// chaeck by device id?
         var deviceId = util.getDeviceId.call(this);
         // if (this.attributes['enqueued'] && this.attributes['enqueued'].token) {
         //   console.log('PLAYBACK NEARLY FINISHED, BUT I ALREADY HAVE SOMETHING ENQUEUED')
         //     /*
         //      * Since AudioPlayer.PlaybackNearlyFinished Directive are prone to be delivered multiple times during the
         //      * same audio being played.
         //      * If an audio file is already enqueued, exit without enqueuing again.
         //      */
         //     return this.context.succeed(true);
         // }
         console.log('NEARLY FINISHED ATTS', JSON.stringify(this.attributes, null, 2))
         var chosen;
         if (this.attributes.playing.type === 'episode') {
           chosen = util.itemPicker(this.attributes.playing.feed, feeds, 'feed', 'feed');
         } else {
           chosen = config.testExplainerFeed;
         }
         var boundThis = this;
         feedLoader.call(this, chosen, false, function(err, feedData) {
           var nextEp = util.nextPicker(boundThis.attributes.playing, 'token', feedData.items, 'guid')
           if (nextEp !== -1) {
             logEnqueue.call(boundThis, nextEp)
             // do I need to put all the playing data in here or let playback started do it?
             // console.log('things ', nextEp.audio.url, nextEp.guid, boundThis.attributes.playing.token);
             boundThis.response.audioPlayerPlay('ENQUEUE', nextEp.audio.url, nextEp.guid, boundThis.attributes.playing.token, 0);
             boundThis.emit(':saveState', true);

           }
           console.log('playback NEARLY FINISHED , playing: ', this.attributes.playing)

         })


    },
    'PlaybackFailed' : function () {
        console.log("Playback Failed ", JSON.stringify(this.event, null, 2));

        logFail.call(this, this.event.request.token , this.event.request.error);
        //  AudioPlayer.PlaybackNearlyFinished Directive received. Logging the error.
        this.context.succeed(true);
    },

});

module.exports = audioEventHandlers;

function logPlay() {
  var deviceId = util.getDeviceId.call(this);
  historyNullCheck.call(this, deviceId);
  console.log("LOGGING PLAY   ", JSON.stringify(this, null, 2));
  console.log("ENQUEUED ", this.attributes.enqueued);
  console.log("PLAYING ", this.attributes.playing);
  var newPlaying;

  if (this.event.request.token == this.attributes.enqueued.guid) {
    // this means we've automatically flipped to a new item via audioPlayer
    newPlaying = {
      status: 'playing',
      type: this.attributes.playing.type,
      feed: this.attributes.playing.feed,
      title: this.attributes.enqueued.title,
      url: this.attributes.enqueued.audio.url,
      token: this.attributes.enqueued.guid,
      progress: getOffsetInMilliseconds.call(this),
      length: this.attributes.enqueued.audio.length
    }
    this.attributes.playing = newPlaying;
    this.attributes.enqueued = {}
    this.attributes.history[this.attributes.playing.token].status = 'auto-started';
    this.attributes.history[this.attributes.playing.token].events.push({
      'event': 'auto-started',
      'timestamp': Date.now(),
      'progress': getOffsetInMilliseconds.call(this)
    })

  } else if (this.attributes.playing.progress === -1) {// this is only MANUAL, right?
    // only if playing and enqueued are the same, nuke enqueued, resetplaying to new dats
    this.attributes.history[this.attributes.playing.token].status = 'started';
    this.attributes.history[this.attributes.playing.token].events.push({
      'event': 'start',
      'timestamp': Date.now(),
      'progress': getOffsetInMilliseconds.call(this)
    })
    this.attributes.playing.progress = getOffsetInMilliseconds.call(this)
    this.attributes.playing.status = 'playing';
  } else {
    //
    this.attributes.playing.status = 'playing';
    this.attributes.playing.progress = getOffsetInMilliseconds.call(this);
    this.attributes.history[this.attributes.playing.token].status = 'resumed';
    this.attributes.history[this.attributes.playing.token].events.push({
      'event': 'resumed',
      'timestamp': Date.now(),
      'progress': getOffsetInMilliseconds.call(this)
    })
  }

}
function logStop() {
  var deviceId = util.getDeviceId.call(this);
  historyNullCheck.call(this, deviceId)
  this.attributes.playing.status = 'stopped';

  this.attributes.history[this.attributes.playing.token].status = 'stopped';
  this.attributes.history[this.attributes.playing.token].events.push({
    'event': 'stop',
    'timestamp': Date.now(),
    'progress': getOffsetInMilliseconds.call(this)
  })

}

function logFinished() {
  var deviceId = util.getDeviceId.call(this);
  historyNullCheck.call(this, deviceId);
  this.attributes.playing.status = 'finished';
  // set play to enqueued? Why isn't enqueue working?
  // this.attributes.playing.progress = -1; // or something else? or wipe it out?
  this.attributes.history[this.attributes.playing.token].status = 'finished';
  this.attributes.history[this.attributes.playing.token].events.push({
    'event': 'finish',
    'timestamp': Date.now(),
    'progress': getOffsetInMilliseconds.call(this)
  })
}

function logFail(token, error) {
  var deviceId = util.getDeviceId.call(this);
  historyNullCheck.call(this, deviceId);
  var token = token || this.attributes.token;
  this.attributes.playing.status = 'failed';

  this.attributes.history[token].status = 'failed';
  this.attributes.history[token].events.push({
    'event': 'failed',
    'error': error,
    'timestamp': Date.now(),
    'progress': getOffsetInMilliseconds.call(this)
  })

}

function logEnqueue(nextEp) {
  var deviceId = util.getDeviceId.call(this);
  historyNullCheck.call(this, deviceId, nextEp.guid);
  this.attributes.playing.progress = getOffsetInMilliseconds.call(this);
  this.attributes['enqueued'] = nextEp;
  this.attributes.history[nextEp.guid].status = 'enqueued';
  this.attributes.history[nextEp.guid].events.push({
    'event': 'enqueued',
    'timestamp': Date.now(),
    'progress': -1
  })

}

function historyNullCheck (deviceId, token, cb) {
  console.log("WHAT THE FUCK HISTORY", deviceId)
  if (!this.attributes) {
    console.log("WE ARE FUCKED");
    console.log(JSON.stringify(this.attributes, null, 2));
  }

  this.attributes = this.attributes || {};
  this.attributes.playing = this.attributes.playing || {};
  var token = token || this.attributes.playing.token;
  console.log("HIST ", this.attributes.history)
  this.attributes.history = this.attributes.history || {};
  this.attributes.history[token] = this.attributes.history[token] || {};
  this.attributes.history[token].status = this.attributes.history[token].status || 'initiated';
  this.attributes.history[token].events = this.attributes.history[token].events || [];
  console.log('historyNullCheck',this.attributes.history[token].events)
}

function getOffsetInMilliseconds() {
    // Extracting offsetInMilliseconds received in the request.
    return this.event.request.offsetInMilliseconds;
}
