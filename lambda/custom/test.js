var request = require('request');

var explainers = require('./explainers.js');
var easter_eggs = require('./easter_eggs.js');

var request = require('request');

console.log("explainers array? ",Array.isArray(explainers));

console.log(`Checking ${explainers.length} explainers`);

// const title_obj = {};
// const guid_obj = {};
const ALTS = [];

const REQUIREMENTS = {
  'title': {},
  'author': ['Kai Ryssdal', 'Molly Wood'],
  'guid': {},
  'alts': true,
  'audio': true,
//   'audio.url': 'uniq',
  'date': true,
};

var progress = 0;

var progressCB = (err) => {
  if (err) {
    throw new Error(err)
  } else {
    progress++;
    if (progress < explainers.length) {
      checkExplainer(explainers[progress], progressCB);
    } else {
      console.log("ALL PASSED!");
    }
  }
}

checkExplainer(explainers[progress], progressCB);

// explainers.forEach((ex) => {
//   checkExplainer(ex, )
//
// })

// checkExplainer(explainers[0], (wh) => {
//   console.log("CB ", wh)
// })
function checkExplainer (ex, cb) {
  console.log("STARTING ", ex.title);
  Object.keys(REQUIREMENTS).forEach((req) => {
    if (!ex[req]) {
      throw new Error(`${ex.title} MISSING  ${req}.`);
    }
    if (Array.isArray(REQUIREMENTS[req])) {
      if (REQUIREMENTS[req].indexOf(ex[req]) < 0) {
        throw new Error(`${req} ${ex[req]} not in options`);
      }
      console.log(`Pass ${req}`);
    } else if (typeof REQUIREMENTS[req] === 'object') {
      if (REQUIREMENTS[req][ex[req]]) {
        throw new Error(`Duplicate ${req} ${ex[req]}`);
      } else {
        console.log(`Pass ${req}`);
        REQUIREMENTS[req][ex[req]] = true;
      }
    } else if (req === 'alts') {
      for (let alt of ex.alts) {
        if (ALTS.indexOf(alt) > -1) {
          throw new Error(`COLLIDING ALT TERM ${alt}`);
        } else {
          ALTS.push(alt)
        }
      }
      console.log(`Pass ${req}`);
    } else if (req === 'audio') {
      if (ex.audio.url.indexOf('https') < 0) {
        throw new Error(`bad audioURL ${ex.audio.url}`);
      }
      request(ex.audio.url, (error, response, body) => {
        if (error) {
          throw new Error(`error from ${ex.audio.url} ${JSON.stringify(error, null,2)}`);
        } else if (response.statusCode !== 200) {
          throw new Error(`bad response ${response.statusCode} from ${ex.audio.url}`);
        } else if (ex.audio.intro) {
          console.log(`200 explainer ${ex.title}`)

          request(ex.audio.intro, (error, response, body) => {
            if (error) {
              throw new Error(`error from ${ex.audio.intro} ${JSON.stringify(error, null,2)}`);
            } else if (response.statusCode !== 200) {
              throw new Error(`bad response ${response.statusCode} from ${ex.audio.intro}`);
            } else {
              console.log(`200 intro ${ex.title}`)
              return cb(null)
              // happy case
            }
          })

        } else {
          console.log(`200 explainer only ${ex.title}`)

          return cb(null)
          // happy case
        }
      })

   }
  });

}
