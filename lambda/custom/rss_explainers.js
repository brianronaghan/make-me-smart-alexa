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
    legacy_dictionary[exp.toLowerCase()] = exp;

  });
 
  let feed = await parser.parseURL('http://paper-marketplace.test/feed/alexa/mms-explainers');
  console.log(feed.title);
  
  feed.items.forEach(item => {
    // console.log(item)
  });
  let exps = feed.items.map(item => {
      let audio = {}
      console.log(item.title);
    item.audios.forEach(ai => {
        if (ai.$ && ai.$.url) {
            if (ai.$.expression == 'sample') {
                audio.intro = ai.$.url
            } else {
                audio.url = ai.$.url
            }
        }
    })
    let alts = [];
    alts.push(item.title.toLowerCase())
    item.title.split(' ').forEach((word) => alts.push(word.toLowerCase()))
    console.log(legacy_explainers.length);
    let legacy_record = legacy_explainers.find((exp) => {
      return exp.title.toLowerCase() == item.title.toLowerCase()
    })
    console.log(legacy_record)

    return {
        title: item.title,
        author: item.author, 
        guid: item.guid, 
        date: item.isoDate,
        guid: item.guid,
        audio,
        keywords: alts,
        alts
    }
  })
 
})();
