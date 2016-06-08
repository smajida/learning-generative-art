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

vec4 stripes(vec2 _uv)
{
    if (mod(_uv.x, 1.0) < 0.2)
    {
        return vec4( 182./255., 62./255., 134./255., pow(learning0+0., 500.) );
    }
    else if (mod(_uv.x, 1.0) < 0.4)
    {
        return vec4( 100./255., 51./255., 141./255., pow(learning1+0., 500.) );
    }
    else if (mod(_uv.x, 1.0) < 0.6)
    {
        return vec4(  61./255., 59./255., 140./255., pow(learning2+0., 500.) );
    }
    else if (mod(_uv.x, 1.0) < 0.8)
    {
        return vec4( 236./255., 100./255., 93./255., pow(learning3+0., 500.) );
    }
    else
    {
        return vec4( 81./255., 123./255., 245./255., 1. );
    }
}
float flatten (vec4 outcolor) {
  return (outcolor.r+outcolor.g+outcolor.b)/4.;
}

void main( )
{
    vec2 uv = (gl_FragCoord.xy / resolution.xy);
    vec2 uvb = uv-0.5;

    float scrollMod = (1.-scrolly*learning3);
    float delayMouseXMod = (delayMouse.x-0.5)*learning4*2.;
    float delayMouseYMod = (delayMouse.y-0.5)*learning5*2.;
    float mtime = (delayMouseYMod * delayMouseXMod * scrollMod * 5. * learning2);

    uv.x += sin(mtime+uvb.x*sin(uvb.x*(6.0)+mtime)*uvb.x*sin(mtime)*(2.0))*0.5+scrollMod;

    uv.x += sin(mtime+uv.y*(5.0*delayMouseYMod))*learning6;
    uv.y += sin(mtime+uv.x*(5.0*delayMouseXMod))*learning7;
    vec4 outcolor = vec4(stripes(uv))*mod(mtime+uv.x,1.0)*0.99;
    if ( flatten(outcolor) < 0.1 ) {
      outcolor = outcolor+vec4(235./255., 23./255., 103./255., learning8);
    }
    outcolor = outcolor-vec4(learning9,learning9,learning9,0.1);
    gl_FragColor = outcolor;
}
