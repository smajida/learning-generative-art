#ifdef GL_ES
precision mediump float;
#endif

//#extension GL_OES_standard_derivatives : enable

uniform float time;
uniform vec2 mouse;
uniform vec2 delayMouse;
uniform vec2 resolution;

const float timeMult = 1.5;
const float radius = 4.;
const int sections = 36;
const float travelDist = 650.;
const float hPI = 3.141592653589793 / 2.;
const float seed = 1000.;

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

vec3 stripes(vec2 _uv)
{
    if (mod(_uv.y, 1.0) < 0.2)
    {
        return vec3(182./255.,62./255.,134./255.);
    }
    else if (mod(_uv.y, 1.0) < 0.4)
    {
        return vec3(100./255.,51./255.,141./255.);
    }
    else if (mod(_uv.y, 1.0) < 0.6)
    {
        return vec3(61./255.,59./255.,140./255.);
    }
    else if (mod(_uv.y, 1.0) < 0.8)
    {
        return vec3(236./255.,100./255.,93./255.);
    }
    else
    {
        return vec3(236./255.,75./255.,136./255.);
    }
}
float flatten (vec4 outcolor) {
  return (outcolor.r+outcolor.g+outcolor.b)/3.;
}

void main( )
{
    vec2 uv = gl_FragCoord.xy / resolution.xy;

    float mtime = (seed*learning0)+time+(5.*learning3);

    uv.y += sin(mtime+uv.x*sin(uv.x*(6.0*learning1)+mtime)*uv.y*sin(mtime)*(10.0*learning2))*0.5;

    uv.y += sin(mtime+uv.x*5.0)*0.2;
    uv.x += cos(mtime+uv.y*5.0)*0.2;
    vec4 outcolor = vec4(stripes(uv),1.0)*mod(mtime+uv.y,1.0)*0.99;
    if ( flatten(outcolor) < 0.1) {
      outcolor = outcolor+vec4(254./255., 217./255., 92./255., 1.);
    }
    outcolor = outcolor-vec4(learning9,learning9,learning9,0.);
    gl_FragColor = outcolor;
}
