var audioFeeds = require('../feeds');

module.exports = {
  feedLister: function () {
      // Generate a list of categories to serve several functions
      var categoryList = 'Here are the shows we have: ';
      var cardCategoryList = 'Our Shows: ';
      var index = 0;
      feeds.forEach(function (audioFeed) {
          categoryList += (++index) + constants.breakTime['100'] + audioFeed.feed + constants.breakTime['200'];
          cardCategoryList += (index) + ') ' + audioFeed.feed + ' \n';
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
  }
}
