'use strict';
class Utils {
  static $ (sel) {
    return document.querySelector(sel);
  }
  static $$ (sel) {
    return [].slice.call(document.querySelectorAll(sel));
  }
  static getBodyDimensions() {
    let body = document.body,
      html = document.documentElement;
    return {
      height: Math.max( body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight ),
      width: Math.max( body.scrollWidth, body.offsetWidth, html.clientWidth, html.scrollWidth, html.offsetWidth )
    }
  }
  static getPageScroll() {
    let doc = document.documentElement;
    return {
      scrollX: (window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0),
      scrollY: (window.pageYOffset || doc.scrollTop)  - (doc.clientTop || 0)
    }
  }
  static getCTAPostition() {
    let ele = Utils.$('#main-cta');
    return {
      x: (ele.offsetLeft || 0),
      y: (ele.offsetTop || 0)
    }
  }
  static getKeys(obj) {
    let keys = [];
    for (let key in obj) {
      keys.push(key);
    }
    return keys;
  }
  static getUrlVars( key, _href ) {
    var href = _href || window.location.href;
    var map = {};
    var parts = href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
      map[key] = value;
    });
    if (key) {
      return map[key];
    }
    return map;
  }
}
module.exports = Utils;
