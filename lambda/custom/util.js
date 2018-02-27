var Alexa = require("alexa-sdk");
var feeds = require('./feeds');
var constants = require('./constants');
var request = require('request');

const makeImage = Alexa.utils.ImageUtils.makeImage;
const makePlainText = Alexa.utils.TextUtils.makePlainText;
const makeRichText = Alexa.utils.TextUtils.makeRichText;


module.exports = {
  // feedLister: function () {
  //     // Generate a list of categories to serve several functions
  //     var categoryList = 'Here are the shows we have: ';
  //     var cardCategoryList = 'Our Shows: ';
  //     var index = 0;
  //     feeds.forEach(function (feeds) {
  //         categoryList += (++index) + constants.breakTime['100'] + feeds.feed + constants.breakTime['200'];
  //         cardCategoryList += (index) + ') ' + feeds.feed + ' \n';
  //     });
  //     categoryList += '. Which one would you like to hear?';
  //     cardCategoryList += 'Which one would you like to hear?';
  //     return {
  //       categoryList,
  //       cardCategoryList
  //     }
  // },
  sendProgressive: function (endpoint, requestId, accessToken, speech, cb) {
    const ds = new Alexa.services.DirectiveService();
    const directive = new Alexa.directives.VoicePlayerSpeakDirective(requestId, speech);

    const progressiveResponse = ds.enqueue(directive, endpoint, accessToken)
      .then(function (what) {
        cb(null, what)
      })
      .catch((err) => {
        console.log('err', JSON.stringify(err, null, 2));
        cb(err, null)
      });
  },
  cardImage: function (url) {
    return {
      smallImageUrl: url,
      largeImageUrl: url
    }
  },
  templateListTemplate1: function (title, token, itemLabel, itemTitleKey, items) {
    var listItemBuilder = new Alexa.templateBuilders.ListItemBuilder();
    var listTemplateBuilder = new Alexa.templateBuilders.ListTemplate1Builder();
    items.forEach(function(item, i) {
      var image;
      if (item.image) {
        image = makeImage(item.image, 88, 88);
      }
      // addItem signature:
      // addItem(image, token, primaryText, secondaryText, tertiaryText) {

      listItemBuilder.addItem(image, `Pick${itemLabel}_${i}`, makeRichText(`<font size='5'>${item[itemTitleKey]}</font>`));
    });
    var autoListItems = listItemBuilder.build();

    var listTemplate = listTemplateBuilder.setToken(token)
      .setTitle(title)
      .setListItems(autoListItems)
      .build();

    console.log('listTemplate', listTemplate);
    return listTemplate;
  },
  templateBodyTemplate1: function (title, body, backgroundImage) {
    body = body.replace(/<emphasis level='strong'>/gi, "<b>")
    body = body.replace(/<emphasis>/gi, "<b>")
    console.log("NEW BODY ", body)
    var template = {
         "type": "BodyTemplate1",
         "title": title,
         "textContent": {
           "primaryText": {
             "type": "RichText",
               "text": `<font size='7'>${body}</font>`
           },
         },
         // "backgroundImage": makeImage(backgroundImage),
         "backButton": "HIDDEN"
    }
    console.log('body', JSON.stringify(template));
    return template;


  },

  templateBodyTemplate3: function (title, image, description) {
    var template = {
         "type": "BodyTemplate3",
         "title": title,
         "textContent": {
           "primaryText": {
             "type": "RichText",
             "text": "<action value='PlayLatestEpisode'>Play latest</action> | <action value='List_episodes'>List episodes</action><br/>"
           },
           "secondaryText": {
             "type": "PlainText",
             "text": "Say 'play the latest' or 'list episodes'."
           },
           "tertiaryText": {
             "type": "PlainText",
             "text": description
           }
         },
         "image": makeImage(image.smallImageUrl, 340, 340),
         "backButton": "VISIBLE"
    }
    console.log('body', JSON.stringify(template));
    return template;


  },
  templateBodyTemplate6: function (title, body, backgroundImage) {
    var template = {
         "type": "BodyTemplate6",
         "title": title,
         "textContent": {
           "primaryText": {
             "type": "RichText",
             "text": `<font size='3'>${body}</font>`
           },
           "secondaryText": {
             "type": "PlainText",
             "text": title
           },
         },
         // "backgroundImage": makeImage(backgroundImage),
         "backButton": "HIDDEN"
    }
    console.log('body', JSON.stringify(template));
    return template;


  },

  cleanShowName: cleanShowName,
  itemLister: function(items, itemTitlePlural, titleKey, start, chunkLength) {
    var itemsAudio, itemsCard;
    if (start === 0) {
      itemsAudio = `Here are the ${itemTitlePlural} we have: `
      itemsCard = '';
    } else {
      itemsAudio = itemsCard = '';
    }
    for (var x = start; x < start + chunkLength; x++) {
      console.log(x, items[x]);
      if (items[x]) {
        itemsAudio += constants.breakTime['25'] +  `${x+1}, ${items[x][titleKey]}` + constants.breakTime['25'];
        itemsCard += `${x+1}) ${items[x][titleKey]}\n`;
      }
    }
    itemsAudio += 'Choose one ';
    itemsCard += 'Choose one ';
    if (start == 0) {// if start is 0
      if (chunkLength < items.length) {// if chunk length is less than total length
        // add more
        itemsAudio += constants.breakTime['50'] + `or say next for more ${itemTitlePlural}`;
        itemsCard += ` or say next for more ${itemTitlePlural} `;
      }
    } else {// start != 0
      if (start + chunkLength < items.length -1) {// if it is start + chunk is < total length
        // add more
        itemsAudio += constants.breakTime['50'] + `or say next for more ${itemTitlePlural}`;
        itemsCard += ` or say next for more ${itemTitlePlural} `;
      }
      // always have previous (if we're gonna do previous)
      itemsAudio += `or say previous to hear the last ${chunkLength}`;
      itemsCard += `or say previous to hear the last ${chunkLength}`;
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
    } else if (typeof intentSlot === 'string') {
        index = itemNames.indexOf(cleanShowName(intentSlot));
    } else if (intentSlot && intentSlot[choiceKey] && intentSlot[choiceKey].value) {
        var cleanedSlot = cleanShowName(intentSlot[choiceKey].value);
        index = itemNames.indexOf(cleanedSlot);
    } else {
        index = -1;
    }
    console.log(index, " the index ", choices[index])
    var chosen;
    if (index >= 0 && index < choices.length) {
        chosen = choices[index];
    }
    console.log('WTF', chosen);
    return chosen;

  },
  // feedPicker: function (intentSlot, callback) {
  //     /*
  //      *  Extract the category requested by the user
  //      *  index stores position of category requested
  //      *  category requested in 3 different ways :
  //      *      1) Amazon.NumberIntent - (1,2,3 ...)
  //      *      2) Ordinal - (1st, 2nd, 3rd ...)
  //      *      3) Category Name - (World, Technology, Politics ...)
  //      */
  //     console.log("IN `FEED` PICKER ",  intentSlot)
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

function cleanShowName (showString) {
  var cleanedSlot = showString.toLowerCase();
  var reg = /market place/i;
  cleanedSlot = cleanedSlot.replace(reg, 'marketplace');
  console.log('clean', cleanedSlot)
  return cleanedSlot;
};
