var explainers = require('./explainers.js');

var util = require('./util.js');

var exits = {
  'ShouldExit': [
    "I'm good",
    "i am good",
    "off",
    "turn off",
    "turn off please",
    'exit please',
    'please exit',
    'None',
    'none of em',
    'npr',
    'drake radio',
    'play this american life',
    'play WBEZ',
    'set my alarm',
    "Pokémon",
  ],
  'ShouldExternal': [
    'npr',
    'drake radio',
    'play this american life',
    'play WBEZ',
    'set my alarm',
    "Pokémon",
  ],
  'ShouldNotExit': [
    'brexit',
    'cool',
    'UNRES:',
    'interest rates',
  ]
}

var intentResolutions = {
  'AMAZON.NextIntent': [
    "I'd like to hear another",
    "next please",
    "another please"
  ]
}

let directions = {
  OlderExplainers: [
    'older older',
    'next',
    'more please',
    'more explainers',
    'older explainers'
  ],
  NewerExplainers: [
    'previous',
    'go back',
    'back please',
    'up please'
  ],
  'undefined': [
    'uptown girl'
  ]

};


// TODO: collision testing by setting list of searches and how they should resolve

var searchResults = {
  tax_postcard: [
    'taxes on postcard',
    'postcard taxes',
    'taxes',
    'texas',
    'postcard tax',
    'postcard tacs'

  ],
  online_sales_tax: [
    'online tax',
    'online sales tax',
    'tax',
    'sales tax',
    'online sales',
  ],
  airline_fees: [
    'airline fees',
    'airline',
  ],
  bonds_launch: [
    'market',
    'bomb market',
  ],
  super_soakers: [
    'super soaker',
    'sue her soaker',
    'water gun',
    'super',
    'so curse',
    'so cursed'
  ],
  pokemon: [
    'mom',
    'hokey nam',
    'pokemon',
    'pokey man',
    'poke the non',
    'Pokémon'
  ],
  movie_subscriptions: [
    'movie subs',
    'movie pass',
    'movie',
    'moviepass',
    'subscriptions',
    'subscription movies',
    'movies pass'
  ],
  'summer_blockbusters-1': [
    'movies',
    'summer movies',
    'summer movie blockbusters',
    'block busters',
    'some her movies',
    'summer block busters',
    'summer movie'
  ],
  household_debt_launch: [
    'house hold explain are',
    'household explainer',
    'households are',
    'house hold it',

  ],
  "5G_launch": [
    'fine g',
    '5G'
  ],
  two_dollar_bill: [
    'two dollar',
    'dollar',
    'two',
  ],
  cardboard: [
    'card board',
    'car bored',
  ],
  shark_week: [
    'shark',
    'chart week',
    'card week'
  ]



}

runSearch();
function runSearch () {
  var itemNames = explainers.map((choice) => choice.title.toLowerCase());
  var itemAlts = explainers.map((choice) => choice.alts && choice.alts);
  var itemKeywords = explainers.map((choice) => choice.keywords && choice.keywords);
  console.log(`RUNNING exit checks`);
  for (let behavior in exits) {
    for (let utt of exits[behavior]) {
      if (behavior === 'ShouldExit') {
        if (util.intentCheck(utt) !== 'AMAZON.CancelIntent') {
          throw new Error(`${utt} didnt cancel -- instead got: ${util.intentCheck(utt)}`);
        }
      } else if (behavior === 'ShouldExternal') {
        if (util.externalCheck(utt) !== 'AMAZON.CancelIntent') {
          throw new Error(`${utt} didnt hit EXTERNAL -- instead got: ${util.intentCheck(utt)}`);
        }
      } else {
        if (util.intentCheck(utt) === 'AMAZON.CancelIntent') {
          throw new Error(`${utt} got false positive: ${util.intentCheck(utt)}`);

        }
      }

    }

  }
  // for (let utt of exits) {
  //   if (util.intentCheck(utt) !== 'AMAZON.CancelIntent') {
  //     throw new Error(`utt didn't cancel - ${utt} -- instead got: ${util.intentCheck(utt)}`);
  //   }
  // }



  for (let direction in directions) {
    for (let term of directions[direction]) {
      if (direction === 'undefined') {
        if (util.directionCheck(term)) {
          throw new Error(`direction FALSE POSITIVE  - ${term} produced ${util.directionCheck(term)}`);
        }
      } else if (util.directionCheck(term) !== direction) {
        throw new Error(`direction didn't resolve - ${term}`);

      }
    }
  }


  let searchCount = 0;
  let guidCount = 0;
  for (let explainerKey in searchResults) {
    for (let searchTerm of searchResults[explainerKey]) {
      let index = util.searchByName(searchTerm, itemNames, itemAlts, itemKeywords);
      if (index < 0) {
        throw new Error(`SEARCH TERM UNFOUND - ${searchTerm}`);
      } else if (explainers[index].guid !== explainerKey) {
        throw new Error(`SEARCH ${searchTerm} returned wrong guid ${explainers[index].guid}`);
      } else {
        searchCount++
      }
    }
    guidCount++;

  }
  console.log(`Searched ${searchCount} terms across ${guidCount} explainers successfully.`)
}
