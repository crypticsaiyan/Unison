const createGlobe = require('cobe').default || require('cobe');
try {
  createGlobe({ width: 100, height: 100 }, {
    devicePixelRatio: 1,
    width: 100, height: 100,
    phi: 0, theta: 0,
    dark: 1, diffuse: 1.3,
    mapSamples: 1000, mapBrightness: 1,
    baseColor: [1, 1, 1], markerColor: [1, 1, 1], glowColor: [1, 1, 1],
    markers: [],
    onRender: (state) => {}
  });
  console.log("Success");
} catch (e) {
  console.error(e.message);
}
