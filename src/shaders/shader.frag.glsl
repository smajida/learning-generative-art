#ifdef GL_ES
precision mediump float;
#endif

//#extension GL_OES_standard_derivatives : enable

uniform float time;
uniform float scrolly;
uniform vec2 ctaDistance;
uniform vec2 delayMouse;
uniform vec2 resolution;

const float timeMult = 1.5;
const float radius = 4.;
const int sections = 36;
const float travelDist = 650.;
const float hPI = 3.141592653589793 / 2.;
const float timeEffectDampening = 100.;

uniform float seed;

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

    if (sin(mod(_uv.x, 1.0)) > learning8 && sin(mod(_uv.x, 1.0)) < sin(learning8)+(sin(learning9)/2.)) {
        stripeout = vec4( 182./255., 62./255., 134./255., 1. );
    } else if (sin(mod(_uv.x, 1.0)) > learning9 && sin(mod(_uv.x, 1.0)) < sin(learning9)+(sin(learning8)/1.2)) {
        stripeout = stripeout+vec4( 1., 1., 1., 0.1 );
    }

    stripeout = stripeout+vec4( (_uv.y) );

    stripeout = stripeout+(_uv.y * modifyYColor);
    stripeout = stripeout+(_uv.x * modifyXColor);
    stripeout = stripeout-vec4( 0., 0., 0., (cos(_uv.y))/(2.*sin(learning7)));
    return stripeout;
}

float snoise(vec2 co){
    return (fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453))*0.00000001;
}

float flatten (vec4 outcolor) {
    return (outcolor.r + outcolor.g + outcolor.b)/4.;
}

void main( )
{
    float modifyScroll = learning0;
    float modifyTimeEffect = learning1;
    float modifyMouseX = sin(learning2);
    float modifyMouseY = sin(learning3);
    float modifyOpacity = sin(learning4);
    float modifyXColor = sin(learning5);
    float modifyYColor = sin(learning6);
    //float learning7; //used above
    //float learning8; //used above
    //float learning9; //used above

    float scrollMod = sin(scrolly*modifyScroll);
    float delayMouseXMod = (delayMouse.x)*modifyMouseX;
    float delayMouseYMod = (delayMouse.y)*modifyMouseY;
    float mtime = sin(time+seed)*modifyTimeEffect;

    vec2 uv = (gl_FragCoord.xy / resolution.yy);
    uv.x = uv.x+learning7;
    uv.y = uv.y+scrolly;

    vec2 uvb = vec2( sin(uv.x-0.5+delayMouseXMod), sin(uv.y-0.5+delayMouseYMod) );


    uv.x += (uvb.x * uvb.x) + ((cos(mtime)) * scrollMod);

    uv.x += sin(uv.y*(delayMouseYMod)) - learning8;
    uv.y += sin(uv.x*(delayMouseXMod)) - learning8;
    vec4 outcolor = stripes(uv, modifyXColor, modifyYColor)+vec4(0.,0.,0.,mod(uv.x,1.0)*0.99);

    //outcolor = outcolor-vec4(0.,0.,0.,0.1);
    gl_FragColor = outcolor;
}
