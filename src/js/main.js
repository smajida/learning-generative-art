import 'babel-polyfill';

let canvas, gl, buffer, vertex_shader, fragment_shader, currentProgram, vertex_position;

const DEF_FRAG = 'shader.frag';
const DEF_VERT = 'shader.vert';

let delayMouse = {
  x: 0,
  y: 0
};
let mouse = {
  x: 0,
  y: 0
};


window.reward = 0;
window.mouse = mouse;

const fetch = require('whatwg-fetch');
const TweenMax = require('gsap');
const _ = require('lodash');

const ROOT = location.origin.replace('8080','3210');
const glUtils = require('./glUtils');
const focusUtils = require('./window.focus.util');
const artist = require('./artist');
const utils = require('./utils');
const pageUI = require('./ui');

const $ = utils.$;
const $$ = utils.$$;

let $score = $('#score');

class ArtistRenderer {
  constructor() {
    this.parameters = {
      seed: Math.random(),
      start_time : Date.now(),
      time : 0,
      scrolly : 0,
      screenWidth : 1,
      screenHeight : 1,
      pageHeight: 1,
      pageWidth: 1
    };

    this.helpers = {
      scrollDelta: 0,
      scrollDistance: 0
    }

    canvas = document.getElementById('glcanvas' );
    mouse.x = window.innerWidth/2;
    mouse.y = window.innerHeight/2;

    gl = glUtils.setupWebGL(canvas, {preserveDrawingBuffer: (utils.getUrlVars('captureMode')) });
    window.gl = gl;

    // THINK ABOUT A LARGER VERTEX BUFFER
    buffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, buffer );

    // Make a giant square to display fragment shader on
    gl.bufferData( gl.ARRAY_BUFFER, new Float32Array([
      -1.0, -1.0, 1.0,
      -1.0, -1.0, 1.0,
       1.0, -1.0, 1.0,
       1.0, -1.0, 1.0
    ]), gl.STATIC_DRAW );

    // Create GL Program
    let fragShaderName = (utils.getParameterByName('frag') || DEF_FRAG) + '.glsl';
    let vertShaderName = (utils.getParameterByName('vert') || DEF_VERT) + '.glsl';

    currentProgram = this.createProgram( `${fragShaderName}`, `${vertShaderName}` );

    pageUI.shuffleMessages();
    this.onWindowResize();
    this.addEventListeners();
    this.animate();
  }
  addEventListeners () {
    window.addEventListener('resize', this.onWindowResize.bind(this), false);
    window.addEventListener('mousemove', this.onMouseMove.bind(this), false);
    window.addEventListener('scroll', this.onMouseMove.bind(this), false);
    window.addEventListener('main-cta-click', pageUI.shuffleMessages, false);
    $('body').addEventListener('mouseleave', this.onMouseLeave.bind(this), false );
    window.addEventListener('keydown', this.onKeyDown.bind(this));
  }
  onMouseLeave(event) {
    this.decreaseMerit();
  }
  onKeyDown(event) {
    console.log('keypressed', event.keyCode);

    if (event.keyCode === 38) { //UP ARROW
      this.saveImage();
      this.increaseMerit();
    } else if (event.keyCode === 40) { //DOWN ARROW
      this.decreaseMerit();
    } else if (event.keyCode === 80) { //"P" KEY
      window.reward = 0;
      this.panicButton();
    }
  }
  onWindowResize(event) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.parameters.screenWidth = canvas.width;
    this.parameters.screenHeight = canvas.height;

    let pageSize = utils.getBodyDimensions();

    this.parameters.pageWidth = pageSize.width;
    this.parameters.pageHeight = pageSize.height;

    gl.viewport( 0, 0, canvas.width, canvas.height );
  }
  onMouseMove (event) {
    let scroll = utils.getPageScroll();
    if (typeof event.pageX !== 'undefined') {
      this.helpers.scrollDistance = scroll.scrollY;
      this.helpers.scrollDelta = scroll.scrollY - this.helpers.scrollDistance;
      mouse = { x: event.pageX, y: event.pageY };
    } else {
      this.helpers.scrollDelta = scroll.scrollY - this.helpers.scrollDistance;
      mouse.y = mouse.y + this.helpers.scrollDelta;
      this.helpers.scrollDistance = scroll.scrollY;
    }
    console.log(mouse);
    window.mouse = mouse;
  }
  animate() {
    requestAnimationFrame(this.animate.bind(this));
    //this.processScrollDelta();
    this.processDelayMouse();
    this.render();
  }
  processScrollDelta() {
    this.helpers.scrollDistance = utils.getPageScroll().scrollY;
    console.log((mouse.y));
  }
  processDelayMouse() {
    delayMouse.x += (mouse.x-delayMouse.x)/16;
    delayMouse.y += (mouse.y-delayMouse.y)/16;
  }
  saveImage() {
    let imgData = canvas.toDataURL();
    console.log('test',imgData.length);
    fetch(ROOT+'/goodpainting', {
        method: 'POST',
        body: imgData
      })
      .then(utils.checkStatus)
      .then(utils.parseJSON)
      .then(function (e,d) {
        console.log(e,d);
      })
      .catch(function (e) {
        console.error('Error:',e);
      });
  }
  panicButton () {
    window.dispatchEvent(new Event('panic'));
  }
  increaseMerit () {
    window.reward+=10;
    window.dispatchEvent(new Event('learn'));
  }
  decreaseMerit (key) {
    window.reward-=50;
    if (window.reward<=0) window.reward = 0;
    window.dispatchEvent(new Event('learn'));
  }

  createProgram( vertex, fragment ) {
    let program = gl.createProgram();
    let vs = this.getShader(gl, vertex);
    let fs = this.getShader(gl, fragment);

    if ( vs == null || fs == null ) return null;

    gl.attachShader( program, vs );
    gl.attachShader( program, fs );

    gl.deleteShader( vs );
    gl.deleteShader( fs );

    gl.linkProgram( program );

    if ( !gl.getProgramParameter(program, gl.LINK_STATUS) ) {
      console.error(`
        ERROR:\n
        VALIDATE_STATUS: ${gl.getProgramParameter(program, gl.VALIDATE_STATUS)}
        ERROR: ${gl.getError()} \n
        - Vertex Shader -  ${vertex} \n
        - Fragment Shader -  ${fragment}
      `);
      return null;
    }

    return program;
  }

  createShader( src, type ) {
    var shader = gl.createShader( type );

    gl.shaderSource( shader, src );
    gl.compileShader( shader );

    if ( !gl.getShaderParameter( shader, gl.COMPILE_STATUS ) ) {
      console.error( ( type == gl.VERTEX_SHADER ? "VERTEX" : "FRAGMENT" ) + " SHADER:\n" + gl.getShaderInfoLog( shader ) );
      return null;
    }

    return shader;
  }

  useUniforms (uniforms) {
    if (!uniforms) return;
    uniforms.forEach(function (obj) {
      gl.uniform1f( gl.getUniformLocation( currentProgram, obj.name ), obj.val );
    })
  }

  getShader(gl, shaderID) {
    let shaderScriptFile = require(`../shaders/${shaderID}`);

    // Didn't find shader files. Abort.
    if (!shaderScriptFile) {
      throw new Error(`No shader found here: shaders/${shaderID}`);
      return null;
    }

    let shader;

    if (shaderID.match('frag')) {
      shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderID.match('vert')) {
      shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
      throw new Error(`Shader file must have extension of either .frag.glsl or .vert.glsl`);
      return null;  // Unknown shader type
    }

    gl.shaderSource(shader, shaderScriptFile);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
      return null;
    }

    return shader;
  }

  render() {
    if ( !currentProgram ) return;
    let parameters = this.parameters;

    parameters.time = (Date.now() - parameters.start_time)/10000;
    parameters.scrolly = window.scrollY / parameters.pageHeight;

    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
    gl.useProgram( currentProgram );

    if (typeof learningUniforms !== 'undefined') {
      this.useUniforms(learningUniforms);
    }

    var loc = gl.getUniformLocation(currentProgram, "mat");
    var mat = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
    ];
    mat[5] = canvas.height/canvas.width;
    gl.uniformMatrix4fv(loc, false, mat);

    gl.uniform1f(
      gl.getUniformLocation(currentProgram, 'time'),
      parameters.time );

    gl.uniform1f(
      gl.getUniformLocation(currentProgram, 'seed'),
      parameters.seed );

    gl.uniform1f(
      gl.getUniformLocation(currentProgram, 'scrolly'),
      parameters.scrolly - 0.5);

    gl.uniform2f(
      gl.getUniformLocation(currentProgram, 'resolution'),
      parameters.screenWidth, parameters.screenHeight );

    gl.uniform2f(
      gl.getUniformLocation(currentProgram, 'ctaDistance'),
      mouse.x/parameters.screenWidth, (parameters.screenHeight-mouse.y)/parameters.screenHeight );

    gl.uniform2f(
      gl.getUniformLocation(currentProgram, 'delayMouse'),
      delayMouse.x/parameters.screenWidth, (parameters.screenHeight-delayMouse.y)/parameters.screenHeight );



    gl.bindBuffer( gl.ARRAY_BUFFER, buffer );
    gl.vertexAttribPointer( vertex_position, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vertex_position );
    gl.drawArrays( gl.TRIANGLES, 0, 6 );
    gl.disableVertexAttribArray( vertex_position );

    this.updateScore();
  }

  updateScore () {
    $score.innerHTML = window.reward;
  }

}


module.exports = new ArtistRenderer();
