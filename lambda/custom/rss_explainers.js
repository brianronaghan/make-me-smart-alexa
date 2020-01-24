let Parser = require('rss-parser');
let parser = new Parser({
    customFields: {
        item: [
          ['media:content', 'audios',{keepArray: true}],

        ]
      }
} 
);
 
(async () => {
 
  let feed = await parser.parseURL('http://paper-marketplace.test/feed/alexa/mms-explainers');
  console.log(feed.title);
 
  feed.items.forEach(item => {
    // console.log(item)
  });
  let exps = feed.items.map(item => {
      let audio = {}
    item.audios.forEach(ai => {
        if (ai.$ && ai.$.url) {
            if (ai.$.expression == 'sample') {
                audio.intro = ai.$.url
            } else {
                audio.url = ai.$.url
            }
        }
    })
    
    console.log(audio)
    return {
        title: item.title,
        author: item.author, 
        guid: item.guid, 
        date: item.isoDate,
        guid: item.guid,
        audio

    }
  })
 
})();
