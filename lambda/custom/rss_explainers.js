let Parser = require('rss-parser');
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
(async () => {
  legacy_explainers.forEach((exp) => {
    legacy_dictionary[exp.title.toLowerCase()] = exp;

  });
 
  let feed = await parser.parseURL('https://marketplace-org-preprod.go-vip.co/feed/alexa/mms-explainers');
  console.log(feed.title);
  
  let exps = feed.items.map(item => {
    console.log(item.title)
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

    let guid, keywords, alts;

    if (legacy_record) {
      explainer.guid = legacy_record.guid;
      explainer.keywords = legacy_record.keywords;
      explainer.alts = legacy_record.alts;
    } else {
      explainer.guid = item.guid;
      explainer.alts = [];
      explainer.alts.push(item.title.toLowerCase())
      item.title.split(' ').forEach((word) => explainer.alts.push(word.toLowerCase()))
      explainer.keywords = alts;
    }
    explainer.title = item.title;
    explainer.author = item.author;
    explainer.date = item.isoDate;
    console.log(explainer)
    return explainer
  })
  
})();
