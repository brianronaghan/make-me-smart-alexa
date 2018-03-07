'use strict';

var Alexa = require('alexa-sdk');
var config = require('./config');
var feeds = config.feeds;
var feedHelper = require('./feedHelpers');
var feedLoader = feedHelper.feedLoader;
var util = require('./util')
var audioPlayer = require('./audioPlayer');

var audioEventHandlers = {
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
         // if (this.attributes[deviceId]['enqueued'] && this.attributes[deviceId]['enqueued'].token) {
         //   console.log('PLAYBACK NEARLY FINISHED, BUT I ALREADY HAVE SOMETHING ENQUEUED')
         //     /*
         //      * Since AudioPlayer.PlaybackNearlyFinished Directive are prone to be delivered multiple times during the
         //      * same audio being played.
         //      * If an audio file is already enqueued, exit without enqueuing again.
         //      */
         //     return this.context.succeed(true);
         // }
         console.log('NEARLY FINISHED ATTS', JSON.stringify(this.attributes[deviceId], null, 2))
         var chosen;
         if (this.attributes[deviceId].playing.type === 'episode') {
           chosen = util.itemPicker(this.attributes[deviceId].playing.feed, feeds, 'feed', 'feed');
         } else {
           chosen = config.testExplainerFeed;
         }
         var boundThis = this;
         feedLoader.call(this, chosen, false, function(err, feedData) {
           var nextEp = util.nextPicker(boundThis.attributes[deviceId].playing, 'token', feedData.items, 'guid')
           if (nextEp !== -1) {
             logEnqueue.call(boundThis, nextEp)
             // do I need to put all the playing data in here or let playback started do it?
             // console.log('things ', nextEp.audio.url, nextEp.guid, boundThis.attributes[deviceId].playing.token);
             boundThis.response.audioPlayerPlay('ENQUEUE', nextEp.audio.url, nextEp.guid, boundThis.attributes[deviceId].playing.token, 0);
             boundThis.emit(':saveState', true);

           }
           console.log('NEXT  play', this.attributes[deviceId].playing)

         })


    },
    'PlaybackFailed' : function () {
        console.log("Playback Failed ", JSON.stringify(this.event, null, 2));

        logFail.call(this, this.event.request.token , this.event.request.error);
        //  AudioPlayer.PlaybackNearlyFinished Directive received. Logging the error.
        this.context.succeed(true);
    },

};

module.exports = audioEventHandlers;

function logPlay() {
  var deviceId = util.getDeviceId.call(this);
  historyNullCheck.call(this, deviceId);
  console.log("LOGGING PLAY   ", JSON.stringify(this, null, 2));
  console.log("ENQUEUED ", this.attributes[deviceId].enqueued);
  console.log("PLAYING ", this.attributes[deviceId].playing);
  var newPlaying;

  if (this.event.request.token == this.attributes[deviceId].enqueued.guid) {
    // this means we've automatically flipped to a new item via audioPlayer
    newPlaying = {
      status: 'playing',
      type: this.attributes[deviceId].playing.type,
      feed: this.attributes[deviceId].playing.feed,
      title: this.attributes[deviceId].enqueued.title,
      url: this.attributes[deviceId].enqueued.audio.url,
      token: this.attributes[deviceId].enqueued.guid,
      progress: getOffsetInMilliseconds.call(this),
      length: this.attributes[deviceId].enqueued.audio.length
    }
    this.attributes[deviceId].playing = newPlaying;
    this.attributes[deviceId].enqueued = {}
    this.attributes[deviceId].history[this.attributes[deviceId].playing.token].status = 'auto-started';
    this.attributes[deviceId].history[this.attributes[deviceId].playing.token].events.push({
      'event': 'auto-started',
      'timestamp': Date.now(),
      'progress': getOffsetInMilliseconds.call(this)
    })

  } else if (this.attributes[deviceId].playing.progress === -1) {// this is only MANUAL, right?
    // only if playing and enqueued are the same, nuke enqueued, resetplaying to new dats
    this.attributes[deviceId].history[this.attributes[deviceId].playing.token].status = 'started';
    this.attributes[deviceId].history[this.attributes[deviceId].playing.token].events.push({
      'event': 'start',
      'timestamp': Date.now(),
      'progress': getOffsetInMilliseconds.call(this)
    })
    this.attributes[deviceId].playing.progress = getOffsetInMilliseconds.call(this)
    this.attributes[deviceId].playing.status = 'playing';
  } else {
    //
    this.attributes[deviceId].playing.status = 'playing';
    this.attributes[deviceId].playing.progress = getOffsetInMilliseconds.call(this);
    this.attributes[deviceId].history[this.attributes[deviceId].playing.token].status = 'resumed';
    this.attributes[deviceId].history[this.attributes[deviceId].playing.token].events.push({
      'event': 'resumed',
      'timestamp': Date.now(),
      'progress': getOffsetInMilliseconds.call(this)
    })
  }

}
function logStop() {
  var deviceId = util.getDeviceId.call(this);
  historyNullCheck.call(this, deviceId)
  this.attributes[deviceId].playing.status = 'stopped';

  this.attributes[deviceId].history[this.attributes[deviceId].playing.token].status = 'stopped';
  this.attributes[deviceId].history[this.attributes[deviceId].playing.token].events.push({
    'event': 'stop',
    'timestamp': Date.now(),
    'progress': getOffsetInMilliseconds.call(this)
  })

}

function logFinished() {
  var deviceId = util.getDeviceId.call(this);
  historyNullCheck.call(this, deviceId);
  this.attributes[deviceId].playing.status = 'finished';
  // set play to enqueued? Why isn't enqueue working?
  // this.attributes[deviceId].playing.progress = -1; // or something else? or wipe it out?
  this.attributes[deviceId].history[this.attributes[deviceId].playing.token].status = 'finished';
  this.attributes[deviceId].history[this.attributes[deviceId].playing.token].events.push({
    'event': 'finish',
    'timestamp': Date.now(),
    'progress': getOffsetInMilliseconds.call(this)
  })
}

function logFail(token, error) {
  var deviceId = util.getDeviceId.call(this);
  historyNullCheck.call(this, deviceId);
  var token = token || this.attributes.token;
  this.attributes[deviceId].playing.status = 'failed';

  this.attributes[deviceId].history[token].status = 'failed';
  this.attributes[deviceId].history[token].events.push({
    'event': 'failed',
    'error': error,
    'timestamp': Date.now(),
    'progress': getOffsetInMilliseconds.call(this)
  })

}

function logEnqueue(nextEp) {
  var deviceId = util.getDeviceId.call(this);
  historyNullCheck.call(this, deviceId, nextEp.guid);
  this.attributes[deviceId].playing.progress = getOffsetInMilliseconds.call(this);
  this.attributes[deviceId]['enqueued'] = nextEp;
  this.attributes[deviceId].history[nextEp.guid].status = 'enqueued';
  this.attributes[deviceId].history[nextEp.guid].events.push({
    'event': 'enqueued',
    'timestamp': Date.now(),
    'progress': -1
  })

}

function historyNullCheck (deviceId, token, cb) {
  console.log("WHAT THE FUCK HISTORY", deviceId)
  if (!this.attributes[deviceId]) {
    console.log("WE ARE FUCKED");
    console.log(JSON.stringify(this.attributes, null, 2));
  }

  this.attributes[deviceId] = this.attributes[deviceId] || {};
  this.attributes[deviceId].playing = this.attributes[deviceId].playing || {};
  var token = token || this.attributes[deviceId].playing.token;
  console.log("HIST ", this.attributes[deviceId].history)
  this.attributes[deviceId].history = this.attributes[deviceId].history || {};
  this.attributes[deviceId].history[token] = this.attributes[deviceId].history[token] || {};
  this.attributes[deviceId].history[token].status = this.attributes[deviceId].history[token].status || 'initiated';
  this.attributes[deviceId].history[token].events = this.attributes[deviceId].history[token].events || [];
  console.log('historyNullCheck',this.attributes[deviceId].history[token].events)
}

function getOffsetInMilliseconds() {
    // Extracting offsetInMilliseconds received in the request.
    return this.event.request.offsetInMilliseconds;
}
