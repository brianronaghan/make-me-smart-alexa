var explainers = require('./explainers.js');

var util = require('./util.js');

var exits = [
  "I'm good",
  "i am good",
  "off",
  "turn off",
  "turn off please",
  'brexit',
  'exit please',
  'please exit',
  'cool',
  'interest rates',
  'None',
  'none of em',
  'npr',
  'drake radio',
  'play this american life',
  'play WBEZ'
]

var searches = [
  'house hold it',
  'market',
  'bomb market',
  'house hold explain are',
  'household explainer',
  'households are',
  'are',
  'what',
];

searchFor(process.env.SEARCH_TERM);
function searchFor () {
  var itemNames = explainers.map((choice) => choice.title.toLowerCase());
  var itemAlts = explainers.map((choice) => choice.alts && choice.alts);
  var itemKeywords = explainers.map((choice) => choice.keywords && choice.keywords);

  console.log(`RUNNING intentChecks for ${exits.length} utterances`);
  for (let utt of exits) {
    if (util.intentCheck(utt) === 'AMAZON.CancelIntent') {
      console.log(`CANCELLED BY : ${utt}`);

    } else {
      console.log(`INTENT ${utt} passes`)
    }
  }


  console.log(`RUNNING searches for ${searches.length} utterances`);
  for (let search of searches) {
    let index = util.searchByName(search, itemNames, itemAlts, itemKeywords);
    if (index < 0) {
      console.log("NO EXPLAINER FOUND")
    } else {
      console.log(`${search} resolved to: ${explainers[index].title}`)
    }

  }
}
