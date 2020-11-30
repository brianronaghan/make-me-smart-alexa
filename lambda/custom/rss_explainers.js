const { LexModelBuildingService } = require('aws-sdk');
let Parser = require('rss-parser');
const { pindick } = require('./blacklist.js');

let parser = new Parser({
    customFields: {
        item: [
          ['media:content', 'audios',{keepArray: true}],

        ]
      }
} 
);
let legacy_explainers = require('./explainers.js');
let legacy_dictionary = {};

let liveExplainers = {};
module.exports = {
  getExplainers: getExplainers
}

async function getExplainers () {
  if (liveExplainers && liveExplainers.explainers && (new Date () - new Date(liveExplainers.builtAt) < (1000 * 60 * 60)) ) {  // if it exists in cache
    console.log('cache good')
      return liveExplainers.explainers;

  } else { // not in cache, build it
    console.log('needs a rebuild')
    await buildExplainers();
    return liveExplainers.explainers;

  }

};



async function buildExplainers () {
  legacy_explainers.forEach((exp) => {
    legacy_dictionary[exp.title.toLowerCase()] = exp;

  });
 
  let feed = await parser.parseURL('https://www.marketplace.org/feed/alexa/mms-explainers');
  
  let found = 0, total = 0; 
  let unfound = []

  let exps = feed.items.map(item => {
    let explainer = {}
    explainer.audio = {}
    item.audios.forEach(ai => {
        if (ai.$ && ai.$.url) {
            if (ai.$.expression == 'sample') {
              explainer.audio.intro = ai.$.url
            } else {
              explainer.audio.url = ai.$.url
            }
        }
    })

    let legacy_record = legacy_dictionary[item.title.toLowerCase()];
    if (!legacy_record) {
      legacy_record = legacy_explainers.find((LE) => {
        
        LE.title.toLowerCase().trim() == item.title.toLowerCase().trim()
      })
    }
    total++;
    if (legacy_record) {
      found++;
      explainer.guid = legacy_record.guid;
      explainer.keywords = legacy_record.keywords;
      explainer.alts = legacy_record.alts;
    } else {
      unfound.push(item.title);

      explainer.guid = item.guid;
      explainer.alts = [];
      explainer.alts.push(item.title.toLowerCase())
      item.title.split(' ').forEach((word) => explainer.alts.push(word.toLowerCase()))
      
      if (item.content) {
        item.content.split(' ').forEach((word) => explainer.alts.push(word.toLowerCase()))
      }
      explainer.keywords = explainer.alts;
    }
    explainer.title = item.title;
    explainer.author = item.author;
    explainer.date = item.isoDate;
    return explainer
  })
  console.log(`Found ${found} out of ${exps.length}.`)
  // console.log(unfound);

  liveExplainers.explainers = exps;
  liveExplainers.builtAt = new Date();
};
