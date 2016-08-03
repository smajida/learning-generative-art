const utils = require('utils');
const $ = utils.$;
const $$ = utils.$$;

class PageUI {
  static shuffleMessages() {
    let shuffle = function (arr) {
      let counter = arr.length;
      while (counter > 0) {
        let index = Math.floor(Math.random() * counter);
        counter--;
        let temp = arr[counter];
        arr[counter] = arr[index];
        arr[index] = temp;
      }
      return arr;
    }
    let indexShuffle = [];
    let messages = $('#messages');
    let sections = $$('#messages > *');
    sections.forEach((ele, i) => {
      indexShuffle.push(i);
    });
    indexShuffle = shuffle(indexShuffle);
    indexShuffle.forEach((index, ii) => {
      messages.appendChild(sections[index]);
    });
  }
}

module.exports = PageUI;
