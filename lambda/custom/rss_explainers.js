let Parser = require('rss-parser');
let parser = new Parser({
    customFields: {
        item: [
          ['media:content', 'audios',{keepArray: true}],

        ]
      }
} 
);
var util = require('./util.js');

let legacy_explainers = require('./explainers.js');

let legacy_dictionary = {};
(async () => {
  legacy_explainers.forEach((exp) => {
    legacy_dictionary[exp.title.toLowerCase()] = exp;

  });
 
  // let feed = await parser.parseURL('https://marketplace-org-preprod.go-vip.co/feed/alexa/mms-explainers');
  let feed = await parser.parseURL('http://paper-marketplace.test/feed/alexa/mms-explainers');
  // console.log(feed.title);
  
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
    if (legacy_record && false) {
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
    console.log(explainer);
    return explainer
  })
  console.log(`Found ${found} out of ${total}.`)
  // console.log(unfound);
})();
