var Alexa = require("alexa-sdk");
var config = require('./config')
var constants = config.constants;

const makeImage = Alexa.utils.ImageUtils.makeImage;
const makePlainText = Alexa.utils.TextUtils.makePlainText;
const makeRichText = Alexa.utils.TextUtils.makeRichText;


module.exports = {
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
  logExplainer: function (explainer) {
    console.log('explainer log', explainer)
    // Should I switch playig?
    this.attributes.playing = {};
    this.attributes.playing.status = 'playing';
    this.attributes.playing.type = 'explainer';
    this.attributes.playing.token = explainer.guid;
    this.attributes.playing.url = explainer.audio.url;
  },
  nullCheck: nullCheck,
  prosodyToBold: prosodyToBold,
  cleanSlotName: cleanSlotName,

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

      listItemBuilder.addItem(image, `PickItem_${i}`, makeRichText(`<font size='5'>${item[itemTitleKey]}</font>`));
    });
    var autoListItems = listItemBuilder.build();

    var listTemplate = listTemplateBuilder.setToken(token)
      .setTitle(title)
      .setListItems(autoListItems)
      .setBackgroundImage(makeImage(config.background.show))
      .setBackButtonBehavior('HIDDEN')
      .build();
    console.log(JSON.stringify(listTemplate, null,2));
    return listTemplate;
  },
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
    console.log('BODY 6', JSON.stringify(template));
    return template;


  },

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
      // console.log(x, items[x]);
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
      console.log('st', start, 'chu', chunkLength, items.length)
      if (start + chunkLength < items.length) {// if it is start + chunk is < total length
        // add more
        itemsAudio += constants.breakTime['50'] + `or say next for more ${itemTitlePlural}`;
        itemsCard += ` or say next for more ${itemTitlePlural} `;
      }
      // always have previous (if we're gonna do previous)
      itemsAudio += `or say previous to hear the last ${chunkLength}`;
      itemsCard += `or say previous to hear the last ${chunkLength}`;
    }
    itemsAudio += ". What would you like to do?"
    return {itemsAudio, itemsCard};
  },

  itemPicker: function (intentSlot, choices, choiceKey, slotKey) {
    console.log("ITEM PICKER", intentSlot, "SLOT KEY", slotKey);
    var itemNames = choices.map(function (choice) {return choice[choiceKey].toLowerCase()});
    // console.log('itemnames', itemNames);
    // console.log('intent slot', intentSlot);
    var index;
    if (intentSlot && intentSlot.index && intentSlot.index.value) {
        index = parseInt(intentSlot.index.value);
        index--;
    } else if (intentSlot && intentSlot.ordinal && intentSlot.ordinal.value) {
        var str = intentSlot.ordinal.value;
        if (str === "second" || str === "second 1") {
            index = 2;
        } else {
            str = str.substring(0, str.length - 2);
            index = parseInt(str);
        }
        index--;
    } else if (typeof intentSlot === 'string') {
        index = itemNames.indexOf(cleanSlotName(intentSlot));
    } else if (intentSlot && intentSlot[slotKey] && intentSlot[slotKey].value) {
        var cleanedSlot = cleanSlotName(intentSlot[slotKey].value);
        index = itemNames.indexOf(cleanedSlot);
    } else if (intentSlot && intentSlot.query && intentSlot.query.value) {
      var asIndex = parseInt(intentSlot.query.value);
      if (isNaN(asIndex)) {
        var cleanedQuery = cleanSlotName(intentSlot.query.value);
        index = itemNames.indexOf(cleanedQuery);
      } else {
        index = asIndex -1
      }
    } else {
      index = -1;
    }
    var chosen;
    if (index >= 0 && index < choices.length) {
        chosen = choices[index];
        chosen.index = index;
    }
    return chosen;
  },


  nextPicker :function (currentItem, itemKey, choices, choiceKey) {
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
      return -1
    }
    var prevItem = choices[currentItemIndex-1];
    console.log('PREVIOUS ITEM', prevItem);
    return prevItem;
  }
}

function nullCheck(deviceId) {
  if (this.attributes.deviceIds) {
    if (this.attributes.deviceIds.indexOf(deviceId) === -1) {
      console.log('NEW DEVICE on old USER')
      this.attributes.deviceIds.push(deviceId);
    }
  } else {
    console.log('NEW USER')
    this.attributes.userInitiated = new Date().toDateString();
    this.attributes.deviceIds = [];
    this.attributes.deviceIds.push(deviceId);
  }
  this.attributes.indices = this.attributes.indices || {};
  this.attributes.playing = this.attributes.playing || {};
  this.attributes.iterating = this.attributes.iterating || -1;
  this.attributes.requests = this.attributes.requests || [];
}

function prosodyToBold (text) {
  text = text.replace(/<prosody[^>]*>/gi, "<b>")
  text = text.replace(/<\/prosody>/gi, "</b>")
  text = text.replace(/<audio[^>]*>/gi, "")
  return text;
};

function cleanSlotName (showString) {
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
