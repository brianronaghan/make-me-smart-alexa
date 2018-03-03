
var Alexa = require('alexa-sdk');
var util = require('./util');


var controllers = {
  'start': function (chosenEp, type, feedName) {
    var deviceId = util.getDeviceId.call(this);
    var devicePlaying = {
      status: 'requested',
      type: type,
      feed: feedName,
      title: chosenEp.title,
      url: chosenEp.audio.url,
      token: chosenEp.guid,
      progress: -1,
      length: chosenEp.audio.length
    }
    // nullCheck.call(this, deviceId);
    // console.log("I PLAYED ", JSON.stringify(this, null, 2));
    console.log('START', chosenEp.audio.url, chosenEp.guid)
    this.attributes[deviceId].playing = devicePlaying;
    this.response.audioPlayerPlay('REPLACE_ALL', chosenEp.audio.url, chosenEp.guid, null, 0);
    this.emit(':responseReady');



  },
  'resume': function () {
    console.log("RESUME -- ", JSON.stringify(this.attributes, null,2));
    var deviceId = util.getDeviceId.call(this);
    // nullCheck.call(this, deviceId);

    var playing = this.attributes[deviceId].playing;
    this.response.speak(`Resuming ${playing.title}`);
    this.response.audioPlayerPlay('REPLACE_ALL', playing.url, playing.token, null, playing.progress);
    this.emit(':responseReady');


  },
  'stop': function () {

    var deviceId = util.getDeviceId.call(this);
    console.log("STOP -- playing ", this.attributes[deviceId].playing);
    console.log("STOP -- enqueued ", this.attributes[deviceId].enqueued);

    // nullCheck.call(this, deviceId);
    if (this.attributes[deviceId].playing.status === 'finished') {
      this.response.speak('you done. playing the next baby.');
    } else {
      this.response.speak("You asked me to pause, I paused.");
      this.attributes[deviceId].playing['progress'] = this.event.context.AudioPlayer.offsetInMilliseconds;
      this.attributes[deviceId].playing.status = 'paused';
      this.response.audioPlayerStop();
      this.emit(':responseReady');

    }

  },
  'enqueue': function () {
    console.log('enqueued');
  }
};

module.exports = controllers;

function nullCheck (deviceId) {
  this.attributes[deviceId] = this.attributes[deviceId] || {};
  this.attributes[deviceId].playing = this.attributes[deviceId].playing || {};

}
