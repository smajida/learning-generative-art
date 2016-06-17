;(function (window, document) {

const _ = require('lodash');

let timePageLoad = Date.now();
let lastInteraction = {x: 0, y: 0};
let totalInteractions = 0;
let timeSinceLastInteraction = timePageLoad;
window.learningUniforms = generateUniforms();

const ROOT = location.origin.replace('8080','3210');
const num_inputs = getBrainInputs().length; // 1 time in session/page, 2 mouse coords, 2 page scroll, 1 clicks
const num_actions = getActions().length; // 5 possible angles agent can turn
const temporal_window = 20; // amount of temporal memory. 0 = agent lives in-the-moment :)
const network_size = num_inputs*temporal_window + num_actions*temporal_window + num_inputs;

const AUTO_PAINT_CYCLES = 4;
const PAINT_TIME = 10000;
const ML_STATE_COUNTER = 100;


let ValidationWorker = require("worker!./validation-worker");
let validationWorker = new ValidationWorker();
let utils = require('utils');
let TweenMax = require('gsap');
let learnToPaintCycles = AUTO_PAINT_CYCLES;
let interactTime = 0;

let ArtistBrain = require("worker!./artist-brain");
let ArtistBrainWorker = new ArtistBrain();
ArtistBrainWorker.onmessage = function(event) {
  //console.log('Message in Main', event);
  if (ArtistBrainWorker[event.data[0]]) {
    ArtistBrainWorker[event.data[0]].pop().resolve(event.data);
  }
};
function messageArtistBrain (messageType, data) {
  return new Promise(function (resolve, reject) {
    if (ArtistBrainWorker[messageType] && ArtistBrainWorker[messageType].reject) {
      //ArtistBrainWorker[messageType].reject(messageType);
    }
    if ( !ArtistBrainWorker[messageType] ) {
      ArtistBrainWorker[messageType] = [];
    }
    ArtistBrainWorker[messageType].push({
      resolve: resolve,
      reject: reject
    });
    ArtistBrainWorker.postMessage( [messageType].concat(data) );
  });
}


function $ (sel) {
  return document.querySelector(sel);
}
function $$ (sel) {
  return [].slice.call(document.querySelectorAll(sel));
}


window.addEventListener('mousedown', function () {
  lastInteraction.x = mouse.x;
  lastInteraction.x = mouse.y;
  totalInteractions++;
  timeSinceLastInteraction = Date.now()-timeSinceLastInteraction;
}, false);

function incrementInteractTime () {
  interactTime+=0.1;
}
let interactCounterHandle = _.debounce(incrementInteractTime, 10);

window.addEventListener('mousemove', interactCounterHandle, false);
window.addEventListener('scroll', interactCounterHandle, false);

$$('a, button').forEach(function (ele) {
  ele.addEventListener('mouseover', interactCounterHandle, false);
});

window.addEventListener('learn', function () {
  console.log('learn!');
  learnToPaint();
}, false);

window.addEventListener('panic', function () {
  console.log('panic!');

  panicFunction()
    .then(function () {
      window.reward = 0;
      learnToPaintLoop();
    });
}, false);

window.addEventListener('blur', function () {
  interactTime = Math.max(interactTime-50,0);
}, false);




function generateUniforms () {
  //TODO: Better names for unforms
  let limit = 10;
  let _uniforms = [];
  while ( limit-- ) {
    _uniforms.push( { name: 'learning'+limit, index: limit, val: 0.5+((Math.random()-0.5)/10) } );
  }
  console.log(_uniforms);
  return _uniforms;
}

function actionFactory (degree) {
  return function () {
    var resolver;
    var p = new Promise(function (resolve) {
      resolver = resolve;
    });
    TweenMax.to(this, PAINT_TIME/1000, {val: this.val + (degree), onComplete: resolver, ease: Strong.easeInOut });
    return p;
  }
}
var DEGREE = 0.01;
function getActions () {
  return window.learningUniforms.reduce(function (result, currentUniform, index) {
    result.push( (actionFactory(-DEGREE)).bind(currentUniform) );
    result.push( (actionFactory(DEGREE)).bind(currentUniform) );
    return result;
  }, [
  function () {
    if (DEGREE < 0.1) {
      DEGREE * 10;
    }
    //console.log('change degree', DEGREE);
    return Promise.resolve();
  },
  function () {
    if (DEGREE > 0.0000001) {
      DEGREE / 10;
    }
    //console.log('change degree', DEGREE);
    return Promise.resolve();
  },
  function () {
    //no action
    return Promise.resolve();
  }
  ]);
}

function panicFunction () {
  //crazy reset
  window.learningUniforms.forEach(function (currentUniform, index) {
    (function (degree) {
      TweenMax.to(this, PAINT_TIME/500, {val: degree, ease: Strong.easeInOut });
    }).bind(currentUniform)(currentUniform.val+((Math.random()-0.5)/100));
  });

  console.log('Crazy Reset!');
  resetReward();

  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      resolve();
    }, PAINT_TIME*2.1);
  });
}

function loadBrainFromJSON (data) {
  //console.log('Brain Loaded', data);
  if (data.layers) {
    return messageArtistBrain('loadBrainFromJSON', [data]);
  }
  return;
}

function checkStatus(response) {
  if (response.status >= 200 && response.status < 300) {
    return response;
  } else {
    let error = new Error(response.statusText);
    error.response = response;
    throw error;
  }
}
function parseJSON(response) {
  return response.json();
}

function getBrainInputs () {
  return [
    Date.now()-timePageLoad,
    window.scrollX,
    window.scrollY,
    mouse.x,
    mouse.y,
    lastInteraction.x,
    lastInteraction.y,
    DEGREE,
  ].concat(getLearningUniformsInputs());
}
function getLearningUniformsInputs () {
  return window.learningUniforms.map(function (uni) {
    return uni.val;
  })
}

function justPaint() {
  var action = messageArtistBrain('forward', [getBrainInputs()]);

  getActions()[action]();
  setTimeout(function () {
    justPaint();
  }, PAINT_TIME/4);
}

function getKeys(obj) {
  let keys = [];
  for (let key in obj) {
    keys.push(key);
  }
  return keys;
}

function validateResult() {
  let gl = window.gl;
  if (!gl) return;

  return new Promise(function (resolve, reject) {
    validationWorker.onmessage = function(event) {
      //console.log(event);
      resolve(event.data[0]);
    };

    let pixels = new Uint8Array(Math.floor(gl.drawingBufferWidth * gl.drawingBufferHeight * 4));
    gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    validationWorker.postMessage([pixels]);
  });
}

function calculateReward () {
  // seconds on page * 1, interactions * 15, scroll dist total * 10, num pages * 20, clicks contact * 200
  if ( window.isInVisibleState ) {
    window.reward = Math.floor((Date.now()-timePageLoad)/(100*1000)) + Math.floor(interactTime) + (totalInteractions*15);
    console.log(Math.floor((Date.now()-timePageLoad)/(100*1000)), Math.floor(interactTime), (totalInteractions*15))
  }
  return window.reward;
}
function resetReward () {
  timePageLoad = Date.now();
  interactTime = 0;
  totalInteractions = 0;
  window.reward = 0;
}

function learnToPaintLoop () {
  requestAnimationFrame(learnToPaint);
}

let LoadCounter = ML_STATE_COUNTER;
function learnToPaint () {
  if ( utils.getUrlVars('learningmodeoff') ) {
    return;
  }
  if (LoadCounter > 0) {
    LoadCounter--;
    doPainting();
    return;
  }
  LoadCounter = ML_STATE_COUNTER;
  fetchBrainJSON(function (data) {
    if (data && !data[1]) {
      console.error("Error", data);
    }
    doPainting();
  });
}

let SaveCounter = ML_STATE_COUNTER;
function doPainting () {
  return messageArtistBrain('forward', [getBrainInputs()])
    .then(function (messageData) {
      //console.log('fwd', messageData);
      let action = messageData[1];
      let actions = getActions();
      // action is a number in [0, num_actions) telling index of the action the agent chooses
      //.log('Action index: ', action);
      nextPaintingStep();
      return actions[action]()
        .then(function () {
          var reward = calculateReward();
          messageArtistBrain('backward', [reward])  // <-- learning magic happens here
            .catch(function (e) {
              console.error('Error', e);
            });
        });
    });
}

function nextPaintingStep () {
    if (SaveCounter > 0) {
      SaveCounter--;
      doPaintCallback();
      return Promise.resolve();
    }
    SaveCounter = ML_STATE_COUNTER;
    return messageArtistBrain('getJSONFromBrain')
      .then(function (data) {
        return postToMemory(data[1]);
      });
}

function postToMemory (value_net_json) {
  return fetch(ROOT+'/memory', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: value_net_json
    })
    .then(checkStatus)
    .then(parseJSON)
    .then(loadBrainFromJSON)
    .then(doPaintCallback)
    .catch(doPaintCallback);
}

function fetchBrainJSON (callback) {
  return fetch(ROOT+'/brain/brain.json')
    .then(checkStatus)
    .then(parseJSON)
    .then(loadBrainFromJSON)
    .then(callback)
    .catch(callback);
}

function doPaintCallback (e) {
  //if (e) console.log(e);
  requestAnimationFrame(learnToPaintLoop);
  requestAnimationFrame(artistLearnedFlash);
}

function artistLearnedFlash () {
  TweenMax.to('#learned', 0.3, {scale: '1'});
  TweenMax.to('#learned', 0.7, {scale: '0.01', delay: 0.2});
}

function getStarted () {
  if ( utils.getUrlVars('learningmodeoff') ) {
    return justPaint();
  }
  return learnToPaint();
}

function INIT () {
  messageArtistBrain('setup', [network_size, num_actions, num_inputs, temporal_window])
    .then(function () {
      fetchBrainJSON(function (data) {
        if (data && !data[1]) {
          console.error("Error", data);
        }
        getStarted();
      });
    })
    .catch(function (e) {
      console.error(e);
    });
}

INIT();
})(window, document);
