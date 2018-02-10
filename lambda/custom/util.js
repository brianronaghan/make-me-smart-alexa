var feeds = require('./feeds');
var constants = require('./constants');

module.exports = {
  feedLister: function () {
      // Generate a list of categories to serve several functions
      var categoryList = 'Here are the shows we have: ';
      var cardCategoryList = 'Our Shows: ';
      var index = 0;
      feeds.forEach(function (feeds) {
          categoryList += (++index) + constants.breakTime['100'] + feeds.feed + constants.breakTime['200'];
          cardCategoryList += (index) + ') ' + feeds.feed + ' \n';
      });
      categoryList += '. Which one would you like to hear?';
      cardCategoryList += 'Which one would you like to hear?';
      return {
        categoryList,
        cardCategoryList
      }
  },
  cardImage: function (url) {
    return {
      smallImageUrl: url,
      largeImageUrl: url
    }
  },
  itemLister: function(items, itemTitlePlural, titleKey, start, chunkLength) {
    var itemsAudio = `Here are the ${itemTitlePlural} we have. `;
    var itemsCard = `Here are the ${itemTitlePlural} we have:`;
    for (var x = start; x < start + chunkLength; x++) {
      console.log(x, items[x]);
      if (items[x]) {
        itemsAudio += constants.breakTime['50'] +  `${x+1}, ${items[x][titleKey]}` + constants.breakTime['50'];
        itemsCard += `${x+1}) ${items[x][titleKey]}`;
      }
    }
    itemsAudio += 'Choose one!';
    itemsCard += 'Choose one!';
    if (start + chunkLength <= items.length-1) { // check math
      itemsAudio += constants.breakTime['50'] + `or say more to hear the next ${chunkLength} ${itemTitlePlural}`;
      itemsCard += `or say more to hear the next ${chunkLength} ${itemTitlePlural}`;
    } else {
      itemsAudio += "And that's all we got.";
      itemsCard += "And that's all we got."

    }
    return {itemsAudio, itemsCard};
  },
  itemPicker: function (intentSlot, choices, choiceKey) {
    // MONDAY: this is where we begin. Making sure this works... implementing choose show with this... then implementing list episodes intent using itemLister
    var itemNames = choices.map(function (choice) {return choice[choiceKey].toLowerCase()});
    console.log('itemnames', itemNames);
    console.log('intent slot', intentSlot);
    var index;
    if (intentSlot && intentSlot.index && intentSlot.index.value) {
        index = parseInt(intentSlot.index.value);
        index--;
    } else if (intentSlot && intentSlot.ordinal && intentSlot.ordinal.value) {
        var str = intentSlot.ordinal.value;
        if (str === "second") {
            index = 2;
        } else {
            str = str.substring(0, str.length - 2);
            index = parseInt(str);
        }
        index--;
    } else if (intentSlot && intentSlot[choiceKey] && intentSlot[choiceKey].value) {
        index = itemNames.indexOf(intentSlot[choiceKey].value.toLowerCase())
    } else {
        index = -1;
    }
    console.log(index, " the index ", choices[index])
    var chosen;
    if (index >= 0 && index < choices.length) {
        chosen = choices[index];
    }
    return chosen;

  }
  // feedPicker: function (intentSlot, callback) {
  //     /*
  //      *  Extract the category requested by the user
  //      *  index stores position of category requested
  //      *  category requested in 3 different ways :
  //      *      1) Amazon.NumberIntent - (1,2,3 ...)
  //      *      2) Ordinal - (1st, 2nd, 3rd ...)
  //      *      3) Category Name - (World, Technology, Politics ...)
  //      */
  //     console.log("IN FEED PICKER ",  intentSlot)
  //     console.log("categoryNames", categoryNames)
  //
  //     console.log("feedPicker AUDIO FEEDS", audioFeeds)
  //     var index;
  //     if (intentSlot && intentSlot.index && intentSlot.index.value) {
  //         index = parseInt(intentSlot.index.value);
  //         index--;
  //     } else if (intentSlot && intentSlot.ordinal && intentSlot.ordinal.value) {
  //         var str = intentSlot.ordinal.value;
  //         if (str === "second") {
  //             index = 2;
  //         } else {
  //             str = str.substring(0, str.length - 2);
  //             index = parseInt(str);
  //         }
  //         index--;
  //     } else if (intentSlot && intentSlot[choiceKey] && intentSlot[choiceKey].value) {
  //         index = itemNames.indexOf(intentSlot.Show.value.toLowerCase())
  //     } else {
  //         index = -1;
  //     }
  //
  //     console.log(index, " the index ", choices[index])
  //     var chosen;
  //     if (index >= 0 && index < choices.length) {
  //         chosen = choices[index];
  //     }
  //     return chosen;
  // },


}
