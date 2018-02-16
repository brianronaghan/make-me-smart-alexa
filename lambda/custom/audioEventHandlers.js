'use strict';

var Alexa = require('alexa-sdk');

// Binding audio handlers to PLAY_MODE State since they are expected only in this mode.
var audioEventHandlers = {
    'PlaybackStarted' : function () {
        /*
         * AudioPlayer.PlaybackStarted Directive received.
         * Confirming that requested audio file began playing.
         * Storing details in dynamoDB using attributes.
         */
        logPlay.call(this)
        this.emit(':saveState', true);
    },
    'PlaybackFinished' : function () {
        /*
         * AudioPlayer.PlaybackFinished Directive received.
         * Confirming that audio file completed playing.
         * Storing details in dynamoDB using attributes.
         */

        logFinished.call(this);
        this.emit('FinshedHandler'); // did not work... gotta require it or somethign?
        this.emit(':saveState', true);
    },
    'PlaybackStopped' : function () {
        /*
         * AudioPlayer.PlaybackStopped Directive received.
         * Confirming that audio file stopped playing.
         * Storing details in dynamoDB using attributes.
         */
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

        // if (this.attributes['enqueuedToken']) {
        //     /*
        //      * Since AudioPlayer.PlaybackNearlyFinished Directive are prone to be delivered multiple times during the
        //      * same audio being played.
        //      * If an audio file is already enqueued, exit without enqueuing again.
        //      */
        //     return this.context.succeed(true);
        // }

        // var enqueueIndex = this.attributes['index'];
        // enqueueIndex +=1;
        // // Checking if  there are any items to be enqueued.
        // if (enqueueIndex === audioData.length) {
        //     if (this.attributes['loop']) {
        //         // Enqueueing the first item since looping is enabled.
        //         enqueueIndex = 0;
        //     } else {
        //         // Nothing to enqueue since reached end of the list and looping is disabled.
        //         return this.context.succeed(true);
        //     }
        // }
        // // Setting attributes to indicate item is enqueued.
        // this.attributes['enqueuedToken'] = String(this.attributes['playOrder'][enqueueIndex]);
        //
        // var enqueueToken = this.attributes['enqueuedToken'];
        // var playBehavior = 'ENQUEUE';
        // var podcast = audioData[this.attributes['playOrder'][enqueueIndex]];
        // var expectedPreviousToken = this.attributes['token'];
        // var offsetInMilliseconds = 0;
        //
        // this.response.audioPlayerPlay(playBehavior, podcast.url, enqueueToken, expectedPreviousToken, offsetInMilliseconds);
        this.emit(':responseReady');
    },
    'PlaybackFailed' : function () {
        logFail.call(this);
        //  AudioPlayer.PlaybackNearlyFinished Directive received. Logging the error.
        console.log("Playback Failed : %j", this.event.request.error);
        this.context.succeed(true);
    },

};

module.exports = audioEventHandlers;


/*
  this.attributes.history = {
  tokenId: [

]
}
*/

function logPlay() {
  nullCheck.call(this)
  if (this.attributes.playing.progress === -1) {
    this.attributes.history[this.attributes.playing.token].status = 'started';
    this.attributes.history[this.attributes.playing.token].events.push({
      'event': 'start',
      'timestamp': Date.now(),
      'progress': getOffsetInMilliseconds.call(this)
    })
    this.attributes.playing.progress = getOffsetInMilliseconds.call(this)
    this.attributes.playing.status = 'playing';
  } else {
    this.attributes.playing.status = 'playing';
    this.attributes.history[this.attributes.playing.token].status = 'resumed';
    this.attributes.history[this.attributes.playing.token].events.push({
      'event': 'resume',
      'timestamp': Date.now(),
      'progress': getOffsetInMilliseconds.call(this)
    })
  }

}
function logStop() {
  nullCheck.call(this)
  this.attributes.history[this.attributes.playing.token].status = 'stopped';
  this.attributes.history[this.attributes.playing.token].events.push({
    'event': 'stop',
    'timestamp': Date.now(),
    'progress': getOffsetInMilliseconds.call(this)
  })

}

function logFinished() {
  nullCheck.call(this)
  this.attributes.playing.status = 'finished';
  this.attributes.playing.progress = -1; // or something else? or wipe it out?
  this.attributes.history[this.attributes.playing.token].status = 'finished';
  this.attributes.history[this.attributes.playing.token].events.push({
    'event': 'finish',
    'timestamp': Date.now(),
    'progress': getOffsetInMilliseconds.call(this)
  })
}

function logFail() {
  nullCheck.call(this);
  this.attributes.history[this.attributes.playing.token].status = 'failed';
  this.attributes.history[this.attributes.playing.token].events.push({
    'event': 'failed',
    'timestamp': Date.now(),
    'progress': getOffsetInMilliseconds.call(this)
  })

}

function nullCheck () {
  this.attributes.history = this.attributes.history || {};
  this.attributes.history[this.attributes.playing.token] = this.attributes.history[this.attributes.playing.token] || {};
  this.attributes.history[this.attributes.playing.token].status = this.attributes.history[this.attributes.playing.token].status || 'initiated';
  this.attributes.history[this.attributes.playing.token].events = this.attributes.history[this.attributes.playing.token].events || []
}

function getToken() {
    // Extracting token received in the request.
    return this.event.request.token;
}

function getOffsetInMilliseconds() {
    // Extracting offsetInMilliseconds received in the request.
    return this.event.request.offsetInMilliseconds;
}
