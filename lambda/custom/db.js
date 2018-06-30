'use strict';

let config = require('./config.js');
var dynasty = require('dynasty')({ region: process.env.AWS_DEFAULT_REGION });
var sessions = dynasty.table(config.sessionDBName);

var update = function (payload, cb) {
  var boundThis = this;
  var keys = {
    hash: this.event.session.user.userId,
    range: this.event.session.sessionId
  }
  var newPayload;
  sessions.find({hash: this.event.session.user.userId, range: boundThis.event.session.sessionId})
    .then(function(sessionRecord) {
      if (sessionRecord) {
        // console.log("SESSION REC EXISTS --> ", sessionRecord)
        // for key in payload
        for (var key in payload) {
          // if sr.key -
          if (sessionRecord[key]) {
            if (Array.isArray(sessionRecord[key])) {
              sessionRecord[key].push(payload[key][0]);
            } else if (typeof sessionRecord[key] === 'object') {
              sessionRecord[key] = Object.assign(sessionRecord[key], payload[key])
            } else {
              sessionRecord[key] = payload[key];
            }
          } else {
            sessionRecord[key] = payload[key];
          }
        }
        newPayload = sessionRecord;
        delete newPayload.sessionId;
        delete newPayload.userId;
      } else {
        console.log("NO REC")
        newPayload = payload;
        newPayload.timestamp = new Date().toUTCString();
      }
      console.log("NEW PAYLOAD  ", newPayload);
      sessions.update(keys, newPayload)
      .then(function (data) {
        console.log("RESP ",data)
        cb.call(boundThis, null, data)
      })
      .catch(function (err) {
        console.log('ERR', err)
        cb.call(boundThis, err)
      })

      // then just update

    })
    .catch(function (err) {
      console.log('TOTAL FAILURE  ->> ', err)
      cb.call(boundThis, err)
    })
  //NOTE: so i need to i guess check if there is an array / obj, and if so push rather than replace. UGH
  /*
  sessions.update(keys, payload)
    .then(function (data) {
      console.log("RESP ",data)
      cb.call(boundThis, null, data)
    })
    .catch(function (err) {
      console.log('ERR', err)
      cb.call(boundThis, err)
    })
  })
  */
}
module.exports = { update }
