#ifdef GL_ES
precision mediump float;
#endif

//#extension GL_OES_standard_derivatives : enable

uniform float time;
uniform float scrolly;
uniform vec2 mouse;
uniform vec2 delayMouse;
uniform vec2 resolution;

const float timeMult = 1.5;
const float radius = 4.;
const int sections = 36;
const float travelDist = 650.;
const float hPI = 3.141592653589793 / 2.;
const float seed = 100.;
const float timeEffectDampening = 100.;

uniform float learning0;
uniform float learning1;
uniform float learning2;
uniform float learning3;
uniform float learning4;
uniform float learning5;
uniform float learning6;
uniform float learning7;
uniform float learning8;
uniform float learning9;

vec4 stripes(vec2 _uv, float modifyXColor, float modifyYColor)
{
    vec4 stripeout = vec4( 235./255., 23./255., 103./255., 1. );

    if (sin(mod(_uv.x, 1.0)) > 0.2 && sin(mod(_uv.x, 1.0)) < 0.3) {
        stripeout = vec4( 182./255., 62./255., 134./255., 1. );
    }

    stripeout = stripeout+vec4( (_uv.y) );

    stripeout = stripeout+(_uv.y * modifyYColor);
    stripeout = stripeout+(_uv.x * modifyXColor);
    stripeout = stripeout+vec4( (cos(_uv.y)+1.)/(10.*learning7));
    return stripeout;
}

float flatten (vec4 outcolor) {
    return (outcolor.r+outcolor.g+outcolor.b)/4.;
}

void main( )
{
    float modifyScroll = learning0-0.5;
    float modifyTimeEffect = (learning1-0.5);
    float modifyMouseX = learning2-0.5;
    float modifyMouseY = learning3-0.5;
    float modifyOpacity = learning4;
    float modifyXColor = learning5-0.5;
    float modifyYColor = learning6-0.5;
    // float learning7; //used above
    // float learning7;
    //float learning8;
    //float learning9;

    vec2 uv = (gl_FragCoord.xy / resolution.xy);
    vec2 uvb = uv-0.5;

    float scrollMod = (cos(scrolly)*modifyScroll);
    float delayMouseXMod = (delayMouse.x-0.5)*modifyMouseX*2.;
    float delayMouseYMod = (delayMouse.y-0.5)*modifyMouseY*2.;
    float mtime = ((sin(time)+1.)/2.)*modifyTimeEffect;

    uv.x += sin(mtime+uvb.x * sin(uvb.x*(6.0)+mtime) * uvb.y* sin(mtime) * (2.0)) * 0.5 + scrollMod;

    uv.x += sin(uv.y*(5.0*delayMouseYMod));
    uv.y += sin(uv.x*(5.0*delayMouseXMod));
    vec4 outcolor = stripes(uv, modifyXColor, modifyYColor)+vec4(0.,0.,0.,mod(mtime+uv.x,1.0)*0.99);

    //outcolor = outcolor-vec4(0.,0.,0.,0.1);
    gl_FragColor = outcolor;
}
