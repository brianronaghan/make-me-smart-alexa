var Alexa = require("alexa-sdk");
var config = require('./config')
var feeds = config.feeds;
var constants = config.constants;
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
  getDeviceId: function () {
    return this.event.context.System.device.deviceId;
  },
  nullCheck: nullCheck,
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
      .setBackgroundImage(makeImage(config.background.show))
      .build();

    // console.log('listTemplate', listTemplate);
    return listTemplate;
  },
  prosodyToBold: prosodyToBold,
  templateBodyTemplate1: function (title, body, links, backgroundImage) {
    var bodyText = prosodyToBold(body)
    var template = {
         "type": "BodyTemplate1",
         "title": title,
         "textContent": {
           "primaryText": {
             "type": "RichText",
             "text": `<font size='5'>${bodyText}</font>`
           },
           "secondaryText": {
             "type": "RichText",
             "text": links
           },
         },
         "backgroundImage": makeImage(backgroundImage || config.background.show),
         "backButton": "HIDDEN"
    }
    // console.log('TEMPLATE 1', JSON.stringify(template));
    return template;


  },

  templateBodyTemplate3: function (title, image, description, links, background) {
    var template = {
         "type": "BodyTemplate3",
         "textContent": {
           "primaryText": {
             "type": "RichText",
             "text": `<font size='5'>${title}</font>`
           },
           "secondaryText": {
             "type": "PlainText",
             "text": description
           },
           "tertiaryText": {
             "type": "RichText",
             "text": links
           }
         },
         "image": makeImage(image, 340,340),
         "backgroundImage": makeImage(background || config.background.show),
         "backButton": "HIDDEN"
    }
    // console.log('body', JSON.stringify(template));
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
         "backgroundImage": makeImage(backgroundImage),
         "backButton": "HIDDEN"
    }
    // console.log('body', JSON.stringify(template));
    return template;


  },

  cleanShowName: cleanShowName,
  itemLister: function(items, itemTitlePlural, titleKey, start, chunkLength) {
    // TODO: add a listen feature as well... the hint thing we tell them, handles whether next or previous
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
        itemsAudio += `or say next for more ${itemTitlePlural}`;
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
  loadNextItem: function () {
    // NOTE: TK
  },
  nextPicker :function (currentItem, itemKey, choices, choiceKey) {
    console.log('next', currentItem, itemKey, choiceKey);
    console.log('nextpick', JSON.stringify(choices, null, 2));
    var currentItemIndex = choices.findIndex(function(item){
      return item[choiceKey] === currentItem[itemKey];
    });
    if (currentItemIndex === -1) {
      return -1
      console.log('not found')
    }
    var nextItem = choices[currentItemIndex+1];
    if (nextItem) {
      return nextItem;
    } else {
      return -1;
    }
  },
  prevPicker :function (currentItem, itemKey, choices, choiceKey) {
    var currentItemIndex = choices.findIndex(function(item){
      return item[choiceKey] === currentItem[itemKey];
    });
    if (currentItemIndex === -1 || currentItemIndex === 0) {
      console.log('PREVIOUS not found')
      return null
    }
    var nextItem = choices[currentItemIndex-1];
    console.log('PREVIOUS ITEM', nextItem);
    return nextItem;
  },

  itemPicker: function (intentSlot, choices, choiceKey, slotKey) {
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
    } else if (intentSlot && intentSlot[slotKey] && intentSlot[slotKey].value) {
        var cleanedSlot = cleanShowName(intentSlot[slotKey].value);
        index = itemNames.indexOf(cleanedSlot);
    } else {
        index = -1;
    }
    console.log(index, " the index ", choices[index])
    var chosen;
    if (index >= 0 && index < choices.length) {
        chosen = choices[index];
        chosen.index = index;
    }
    console.log('ITEM PICKER ', chosen);
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

function nullCheck(deviceId) {
  console.log("NULL CHECK ", this.attributes)
  if (this.attributes.deviceId !== deviceId) {
    console.log("MISMATCHED DEVICE ID")
  }
  this.attributes.deviceId = deviceId;
  this.attributes.indices = this.attributes.indices || {};
  this.attributes.playing = this.attributes.playing || {};
  this.attributes.enqueued = this.attributes.enqueued || {};
  this.attributes.iterating = this.attributes.iterating || -1;
  this.attributes.queries = this.attributes.queries || [];
  this.attributes.history = this.attributes.history || {};
}

function prosodyToBold (text) {
  text = text.replace(/<prosody[^>]*>/gi, "<b>")
  text = text.replace(/<\/prosody>/gi, "</b>")
  text = text.replace(/<audio[^>]*>/gi, "")
  console.log('TEXT', text)
  return text;
};

function cleanShowName (showString) {
  var cleanedSlot = showString.toLowerCase();
  var reg = /market place/i;
  cleanedSlot = cleanedSlot.replace(reg, 'marketplace');
  // remove all spaces?
  if (cleanedSlot === 'code breaker') {
    cleanedSlot = 'codebreaker';
  }
  console.log('clean', cleanedSlot)
  return cleanedSlot;
};
