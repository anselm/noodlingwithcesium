This is a series of experiments with aframe and cesium. The goal is to have an aframe based tile widget that can be used for an on the ground VR/AR view.

There are three parts to producing maps these days. There is elevation data, image draping, and buildings. In more detail:

1) Terrain. Cesium uses an efficient representation of elevation data - it's documented all over the place, and it's not hard to read, process and generate 3js. This code does that. There are many examples of doing that on the web.
Cesium various standard terrain types: https://cesiumjs.org/data-and-assets/terrain/ .  See also: https://codepen.io/gjn19/pen/qOPOGQ

2) Texture. The problem here is that textures are not aligned with terrain. It can take 4 textures to cover a single piece of terrain. Cesium has a shader that can help. This is still not resolved in this code.

3) Buildings. Cesium has a nice building specification - which can be used as is... and is very easy to apply. There still needs to be ongoing industry work to get building elevation above terrain right.  The 3d tile spec defines these types: https://github.com/AnalyticalGraphicsInc/3d-tiles#spec-status

This folder contains various examples of aframe based explorations:

1. aframe_cesium -> rendering cesium tiles in aframe for an AR/VR viewe

2. aframe_kitchen -> playing around with parametric approaches to rendering a kitchen; constructive solid geometry etc. Also using a json loader aframe component to manufacture other aframe components from json rather than from html.

3. tiles_cesium -> an older exploration into simply fetching cesium tiles and rendering them myself with gltf buildings and draping image terrain from bing maps - images are not done very well and a smart shader should be used instead. This is basically a hodge podge of test code that was refactored later on into aframe_cesium ... and a lot of it thrown out.


