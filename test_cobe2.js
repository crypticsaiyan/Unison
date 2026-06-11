const createGlobe = require('cobe').default || require('cobe');
// use a mock canvas
const canvas = {
  getContext: () => ({
    getExtension: () => null,
    getParameter: () => 0,
    createBuffer: () => {},
    bindBuffer: () => {},
    bufferData: () => {},
    createShader: () => ({}),
    shaderSource: () => {},
    compileShader: () => {},
    getShaderParameter: () => 1,
    createProgram: () => ({}),
    attachShader: () => {},
    linkProgram: () => {},
    getProgramParameter: () => 1,
    useProgram: () => {},
    getAttribLocation: () => 1,
    enableVertexAttribArray: () => {},
    vertexAttribPointer: () => {},
    getUniformLocation: () => ({}),
    uniform1f: () => {},
    uniform2fv: () => {},
    uniform3fv: () => {},
    viewport: () => {},
    clearColor: () => {},
    clear: () => {},
    drawArrays: () => {}
  }),
  addEventListener: () => {},
  removeEventListener: () => {},
  width: 100,
  height: 100
};
const globe = createGlobe(canvas, {
  devicePixelRatio: 1, width: 100, height: 100, phi: 0, theta: 0,
  dark: 1, diffuse: 1.3, mapSamples: 10, mapBrightness: 1,
  baseColor: [1,1,1], markerColor: [1,1,1], glowColor: [1,1,1], markers: []
});
console.log(Object.keys(globe));
