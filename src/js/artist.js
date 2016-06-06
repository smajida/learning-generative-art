;(function (window, document) {

const _ = require('lodash');

let timePageLoad = Date.now();
let lastInteraction = {x: 0, y: 0};
let totalInteractions = 0;
let timeSinceLastInteraction = timePageLoad;
window.learningUniforms = generateUniforms();

const fetch = window.fetch || require('whatwg-fetch').fetch;
const ROOT = location.origin.replace('8080','3210');
const num_inputs = getBrainInputs().length; // 1 time in session/page, 2 mouse coords, 2 page scroll, 1 clicks
const num_actions = getActions().length; // 5 possible angles agent can turn
const temporal_window = 0.99; // amount of temporal memory. 0 = agent lives in-the-moment :)
const network_size = num_inputs*temporal_window + num_actions*temporal_window + num_inputs;
const AUTO_PAINT_CYCLES = 4;
const PAINT_TIME = 1500;
const ML_STATE_COUNTER = 1;


let ValidationWorker = require("worker!./validation-worker");
let validationWorker = new ValidationWorker();
let deepqlearn = require('deepqlearn');
let utils = require('utils');
let TweenMax = require('gsap');
let learnToPaintCycles = AUTO_PAINT_CYCLES;


function $ (sel) {
  return document.querySelector(sel);
}
function $$ (sel) {
  return [].slice.call(document.querySelectorAll(sel));
}


window.addEventListener('click', function () {
  lastInteraction.x = mouse.x;
  lastInteraction.x = mouse.y;
  totalInteractions++;
  timeSinceLastInteraction = Date.now()-timeSinceLastInteraction;
}, false);

let interactTime = 0;
let interactCounterHandle = _.debounce(function () {
  interactTime+=0.1;
}, 10);
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
      window.rewards.merit = 0;
      learnToPaintLoop();
    });
}, false);


// the value function network computes a value of taking any of the possible actions
// given an input state. Here we specify one explicitly the hard way
// but user could also equivalently instead use opt.hidden_layer_sizes = [20,20]
// to just insert simple relu hidden layers.
var layer_defs = [];
layer_defs.push({type:'input', out_sx:1, out_sy:1, out_depth:network_size});
layer_defs.push({type:'fc', num_neurons: 50, activation:'relu'});
layer_defs.push({type:'fc', num_neurons: 500, activation:'relu'});
layer_defs.push({type:'fc', num_neurons: 100, activation:'relu'});
layer_defs.push({type:'fc', num_neurons: num_actions, activation:'relu'});
layer_defs.push({type:'regression', num_neurons:num_actions});

// options for the Temporal Difference learner that trains the above net
// by backpropping the temporal difference learning rule.
var tdtrainer_options = {learning_rate:0.001, momentum:0.0, batch_size:64, l2_decay:0.01};

var opt = {};
opt.temporal_window = temporal_window;
opt.experience_size = 30000;
opt.start_learn_threshold = 10;
opt.gamma = 0.7;
opt.learning_steps_total = 200000;
opt.learning_steps_burnin = 30;
opt.epsilon_min = 0.05;
opt.epsilon_test_time = 0.05;
opt.layer_defs = layer_defs;
opt.tdtrainer_options = tdtrainer_options;

var brain = new deepqlearn.Brain(num_inputs, num_actions, opt); // woohoo


function generateUniforms () {
  //TODO: Better names for unforms
  let limit = 10;
  let _uniforms = [];
  while ( limit-- ) {
    _uniforms.push( { name: 'learning'+limit, index: limit, val: 0.5 } );
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
    TweenMax.to(this, PAINT_TIME/1000, {val: this.val + (degree), onComplete: resolver});
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
  // function () {
  //   console.log('scramble!');
  //   return Promise.all(window.learningUniforms.map(function (currentUniform, index) {
  //     var resolver;
  //     var p = new Promise(function (resolve) {
  //       resolver = resolve;
  //     });
  //     TweenMax.to(currentUniform, PAINT_TIME/1000, {val: currentUniform.val+((Math.random()-0.5)/100), delay: index/500, onComplete: resolver});
  //     return p;
  //   }));
  // },
  function () {
    if (DEGREE < 0.1) {
      DEGREE * 10;
    }
    console.log('change degree', DEGREE);
    return Promise.resolve();
  },
  function () {
    if (DEGREE > 0.0000001) {
      DEGREE / 10;
    }
    console.log('change degree', DEGREE);
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
      TweenMax.to(this, PAINT_TIME/500, {val: degree});
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
  //console.log('Brain Loaded');
  brain.value_net.fromJSON( data ) //LOAD BRAIN;
}

function checkStatus(response) {
  if (response.status >= 200 && response.status < 300) {
    return response
  } else {
    let error = new Error(response.statusText)
    error.response = response
    throw error
  }
}

function parseJSON(response) {
  return response.json()
}

function getBrainInputs () {
  return [
    Date.now()-timePageLoad,
    window.scrollX,
    window.scrollY,
    mouse.x,
    mouse.y,
    lastInteraction.x,
    lastInteraction.y
  ].concat(getLearningUniformsInputs());
}

function getLearningUniformsInputs () {
  return window.learningUniforms.map(function (uni) {
    return uni.val;
  })
}

function justPaint() {
  var action = brain.forward(window.learningUniforms.map(function (uni) {
    return uni.val;
  }));
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

    let pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
    gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    validationWorker.postMessage([pixels]);
  });
}

function calculateReward () {
  // seconds on page * 1, interactions * 15, scroll dist total * 10, num pages * 20, clicks contact * 200
  if ( window.isInVisibleState ) {
    window.rewards.merit = Math.floor((Date.now()-timePageLoad)/(100*1000)) + Math.floor(interactTime) + (totalInteractions*15);
  }
  return window.rewards.merit;
}
function resetReward () {
  timePageLoad = Date.now();
  interactTime = 0;
  totalInteractions = 0;
  window.rewards.merit = 0;
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
    return
  }
  LoadCounter = ML_STATE_COUNTER;
  fetch(ROOT+'/brain/brain.json')
    .then(checkStatus)
    .then(parseJSON)
    .then(loadBrainFromJSON)
    .then(function () {
      doPainting();
    })
    .catch(function (e) {
      console.error("Error", e);
      doPainting();
    });
}

let SaveCounter = ML_STATE_COUNTER;
function doPainting () {

  var action = brain.forward(getBrainInputs());

  // action is a number in [0, num_actions) telling index of the action the agent chooses
  return getActions()[action]().then(function () {

    // here, apply the action on environment and observe some reward. Finally, communicate it:
    var reward = calculateReward();
    brain.backward( reward ); // <-- learning magic happens here

    console.log('Action index: ', action);
    if (SaveCounter > 0) {
      SaveCounter--;
      requestAnimationFrame(learnToPaintLoop);
      requestAnimationFrame(artistLearnedFlash);
      return Promise.resolve();
    }
    SaveCounter = ML_STATE_COUNTER;
    return fetch(ROOT+'/memory', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(brain.value_net.toJSON())
      })
      .then(checkStatus)
      .then(parseJSON)
      .then(loadBrainFromJSON)
      .then(function () {
        requestAnimationFrame(learnToPaintLoop);
        requestAnimationFrame(artistLearnedFlash);
      })
      .catch(function (e) {
        console.error("Error", e);
        requestAnimationFrame(learnToPaintLoop);
        requestAnimationFrame(artistLearnedFlash);
      });
  });

}


function artistLearnedFlash () {
  TweenMax.to('#learned', 0.3, {scale: '1'});
  TweenMax.to('#learned', 0.7, {scale: '0.01', delay: 0.2});
}

fetch(ROOT+'/brain/brain.json')
  .then(checkStatus)
  .then(parseJSON)
  .then(loadBrainFromJSON)
  .then(function () {
    getStarted();
  })
  .catch(function (err) {
    console.log(err);
    getStarted();
  });

function getStarted () {
  if ( utils.getUrlVars('learningmodeoff') ) {
    justPaint();
  } else {
    learnToPaint();
  }
}

})(window, document);
