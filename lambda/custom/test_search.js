var explainers = require('./explainers.js');

var util = require('./util.js');

searchFor(process.env.SEARCH_TERM);
function searchFor (term) {
  var itemNames = explainers.map((choice) => choice.title.toLowerCase());
  var itemAlts = explainers.map((choice) => choice.alts && choice.alts);
  var itemKeywords = explainers.map((choice) => choice.keywords && choice.keywords);

  console.log(`Running search TERM: ${term} on ${explainers.length} records.`);


  let index = util.searchByName(term, itemNames, itemAlts);
  if (index < 0) {
    console.log("NO EXPLAINER FOUND")
  } else {
    console.log(`${term} resolved to: `)
    console.log(JSON.stringify(explainers[index], null,2))
  }
}
