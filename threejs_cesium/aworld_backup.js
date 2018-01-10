
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// helper utilities to initialize 3js - if not using AFrame
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function threejs_init(distance) {

  // here we setup a trackball camera at [ 0,0, distance ] looking back at the origin [ 0,0,0 ]

  let width  = window.innerWidth;
  let height = window.innerHeight;
  let scene = new THREE.Scene();

  let camera = new THREE.PerspectiveCamera(45, width / height, 1.0, 2000);
  camera.position.set(0,0,distance);
  scene.camera = camera;
  scene.add(camera);

  let renderer = new THREE.WebGLRenderer({alpha:true});
  renderer.setSize(width, height);
  //renderer.setClearColor (0xff0000, 1);
  document.getElementById('webgl').appendChild(renderer.domElement);

  let controls = new THREE.TrackballControls(camera); 
  controls.target.set(0,0,0);

  function render() {
    controls.update();    
    requestAnimationFrame(render);
    renderer.render(scene, camera);
  }
  render();

  scene.add(new THREE.AxesHelper(2000000));

  // add a light and a visual representation of that light to the scene at [ 0,0,distance/2 ]

  {
    // a light
    let light = new THREE.PointLight( 0xffffff, 1, 1000 );
    light.position.set(0,0,distance/2);
    scene.add( light );

    // a light representation
    let sgeom = new THREE.SphereGeometry( 5, 32, 32 );
    let material2 = new THREE.MeshBasicMaterial( {color: 0xffff00} );
    let sphere = new THREE.Mesh( sgeom, material2 );
    light.add( sphere )
  }

  return scene;
}

function threejs_earth(scene,lat,lon,size) {

  {
    // earth representation
    let radius = 10;
    let geometry = new THREE.SphereGeometry( radius, 32, 32 );
    let material = new THREE.MeshBasicMaterial( {color: 0xffffff} );
    let loader = new THREE.TextureLoader();
    loader.load('earth.jpg',function (texture) {
      let material = new THREE.MeshBasicMaterial({ map: texture });
      let earth = new THREE.Mesh( geometry, material );
      earth.position.set(radius*2,radius*2,-radius*8);
      scene.camera.add( earth );
      { // red dot marking a longitude and latitude on said globe
        let geometry2 = new THREE.SphereGeometry( radius/10, 32, 32 );
        let material2 = new THREE.MeshBasicMaterial( {color: 0xff0000 } );
        let marker = new THREE.Mesh( geometry2, material2 );
        let v = ll2vector(lat,lon,radius);
        marker.position.set(v[0],v[1],v[2]);
        earth.add( marker );
      }
    });
  }

}

function threejs_recomputeuv(geometry,x,y,scale) {
  // express x and y in vertex space, ie, if a tile ranges from 0 to 100 and the total scale is 400 then x,y could say be 0, 100,200 or 300
  let faces = geometry.faces;
  geometry.faceVertexUvs[0] = [];
  for (let i = 0; i < faces.length ; i++) {
    let v1 = geometry.vertices[faces[i].a]; 
    let v2 = geometry.vertices[faces[i].b]; 
    let v3 = geometry.vertices[faces[i].c];
    geometry.faceVertexUvs[0].push([
        new THREE.Vector2((v1.x + x)/scale, ((v1.y + y)/scale) ),
        new THREE.Vector2((v2.x + x)/scale, ((v2.y + y)/scale) ),
        new THREE.Vector2((v3.x + x)/scale, ((v3.y + y)/scale) )
    ]);
  }
  geometry.uvsNeedUpdate = true;
}


//////////////////////////////////////////////////////////////////////////////////////
// helpers
//////////////////////////////////////////////////////////////////////////////////////

function tile_extent(lod) {
  let scheme = {};
  scheme.lod = lod;
  scheme.w = Math.pow(2,lod+1);
  scheme.h = Math.pow(2,lod);
  scheme.ntiles = scheme.w*scheme.h;
  scheme.wdeg = 360 / scheme.w;
  scheme.hdeg = 180 / scheme.h;
  scheme.meters_wide = 40070000 / scheme.w;
  scheme.meters_tall = 39000000 / scheme.h; // this may be wrong
  return scheme;
}

function tile_lonlat(x,y,lod) {
  let scheme = tile_extent(lod);
  scheme.x = x;
  scheme.y = y;
  scheme.lon = 360 * x / scheme.w;
  scheme.lat = 360 * y / scheme.h;
  return scheme;
}

function tile_xy(lon,lat,lod) {
  let scheme = tile_extent(lod);
  scheme.lon = lon;
  scheme.lat = lat;
  scheme.x = (lon+180) * scheme.w / 360;
  scheme.y = (90-lat) * scheme.h / 360;
  return scheme;
}

function ll2vector(lat,lon,r=1) {
  let phi = (90-lat)*(Math.PI/180)
  let theta = (lon+180)*(Math.PI/180)
  x = -r*Math.sin(phi)*Math.cos(theta);
  z = r*Math.sin(phi)*Math.sin(theta);
  y = r*Math.cos(phi);
  return [x,y,z]
}

/*
var FlatLandBing = {
  // a copy of the code from https://msdn.microsoft.com/en-us/library/bb259689.aspx
  // https://en.wikipedia.org/wiki/Geographic_coordinate_system
  EarthRadius:6378137,
  MinLatitude:85.05112878,
  MaxLatitude:85.05112878,
  MinLongitude:-180,
  MaxLongitude:180,
  Clip: function(n,minValue,maxValue) { return Math.Min(Math.Max(n, minValue), maxValue); },
  MapSize:function(int levelOfDetail) { return 256 << levelOfDetail },
  GroundResolution:function(latitude, levelOfDetail) {
    latitude = Clip(latitude, FlatLandBing.MinLatitude, FlatLandBing.MaxLatitude);
    return Math.Cos(latitude * Math.PI / 180) * 2 * Math.PI * EarthRadius / FlatLandBing.MapSize(levelOfDetail);
  },
  LatLongToPixelXY:function(latitude, longitude, levelOfDetail) {
    latitude = FlatLandBing.Clip(latitude, FlatLandBing.MinLatitude, FlatLandBing.MaxLatitude);
    longitude = FlatLandBing.Clip(longitude, FlatLandBing.MinLongitude, FlatLandBing.MaxLongitude);
    let x = (longitude + 180) / 360; 
    let sinLatitude = Math.Sin(latitude * Math.PI / 180);
    let y = 0.5 - Math.Log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI);
    let mapSize = FlatLandBing.MapSize(levelOfDetail);
    pixelX = (int) Clip(x * mapSize + 0.5, 0, mapSize - 1);
    pixelY = (int) Clip(y * mapSize + 0.5, 0, mapSize - 1);
    return [ pixelX, pixelY ];
  },
  PixelXYToLatLong:function(pixelX, pixelY, levelOfDetail) {
    let mapSize = FlatLandBing.MapSize(levelOfDetail);
    let x = (FlatLandBing.Clip(pixelX, 0, mapSize - 1) / mapSize) - 0.5;
    let y = 0.5 - (FlatLandBing.Clip(pixelY, 0, mapSize - 1) / mapSize);
    latitude = 90 - 360 * Math.Atan(Math.Exp(-y * 2 * Math.PI)) / Math.PI;
    longitude = 360 * x;
    return [ latitude, longitude ];
  },
  PixelXYToTileXY:function(pixelX, pixelY) { return [ Math.floor(pixelX/256), Math.floor(pixelY/256) ] },
  TileXYToPixelXY:function(tileX, tileY) { return [tileX * 256,tileY*256] },
  TileXYToQuadKey:function(tileX, tileY, levelOfDetail) {
  	let quadKey = "";
    for (let i = levelOfDetail; i > 0; i--) {
      let digit = '0';
      let mask = 1 << (i - 1);
      if ((tileX & mask) != 0) { digit++; }
      if ((tileY & mask) != 0) { digit++; digit++; }
      quadKey = quadKey + digit;
    }
    return quadKey.ToString();
  },
  QuadKeyToTileXY:function(quadKey) {
    let tileX = 0, tileY = 0;
    let levelOfDetail = quadKey.Length;
    for (let i = levelOfDetail; i > 0; i--) {
      let mask = 1 << (i - 1);
      switch (quadKey[levelOfDetail - i]) {
        case '0': break;
        case '1': tileX |= mask; break;
        case '2': tileY |= mask; break;
        case '3': tileX |= mask; tileY |= mask; break;
        default: //throw new ArgumentException("Invalid QuadKey digit sequence.");
      }
    }
    return [ tileX, tileY, levelOfDetail ];
  },
  Test:function() {
  	console.log("hello");
  }
}

*/

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// A Tile abstraction
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Convert Cesium terrain tiles to threejs geometry
function AWORLD_Terrain2Geometry(terrain,size,elevation) {
  let geo = 0;
  if(!terrain) {
    geo = new THREE.BoxGeometry(size,size,size/1000.0);
  } else {
    geo = new THREE.Geometry();
    for (var i = 0; i < terrain._uValues.length; i++) {
      let x = terrain._uValues[i] * size / 32767;
      let y = terrain._vValues[i] * size / 32767;
      let z = (((terrain._heightValues[i] * (terrain._maximumHeight - terrain._minimumHeight))  / 32767.0) + terrain._minimumHeight ) + elevation;
      var v = new THREE.Vector3(x, y, z);
      geo.vertices.push(v);
    }
    for (var i = 0; i < terrain._indices.length - 1; i = i + 3) {
      geo.faces.push(new THREE.Face3(terrain._indices[i], terrain._indices[i+1], terrain._indices[i+2]));
    }
    geo.computeFaceNormals(); 
  }
  return geo;
}

function AWORLD_ProduceTerrainTile(props) {
  // Ask Cesium for terrain
  Cesium.when(props.terrainProvider.requestTileGeometry(props.x,props.y,props.lod),function(cesiumTerrainTile){
    // get geometry
    props.geometry = AWORLD_Terrain2Geometry(cesiumTerrainTile,props.size,props.elevation);
    // separately drape image on geometry
    threejs_recomputeuv(props.geometry,props.u,props.v,props.uvrange);
    let temp_material = new THREE.MeshPhongMaterial( {color: 0x883399} );
    props.mesh = new THREE.Mesh(props.geometry,temp_material); //, canvas_material);
    // arrange geometry absolutely in scene
    if(props.scene) {
      //props.mesh.position.set(props.i*props.size,-props.j*props.size,0);
  	  props.scene.add(props.mesh);
    }
  }).otherwise(function(error) {
    console.log('AWORLD tile fetch error occured ', error);
  });
}

// Convert a longitude and latitude to an elevation terrain tile xy index and then request loading of renderable data around that location
function AWORLD_ProduceMap2(props) {

  let lat = props.lat;
  let lon = props.lon;
  let lod = props.lod;
  let size = props.size;
  let elevation = props.elevation;
  let scene = props.scene;
  let terrainProvider = props.terrainProvider;

  // Get index
  let position = Cesium.Cartographic.fromDegrees(lon,lat);
  let xy = terrainProvider.tilingScheme.positionToTileXY(position,lod);

  // get a spread of elevation terrain tiles around the player
  // TODO deal with wraparound
  // TODO don't get tiles twice
  // TODO flush tiles that are far away now
  // TODO remember tiles
  let x = xy.x;
  let y = xy.y;
  for(let i=0;i<4;i++) {
    for(let j=0;j<4;j++) {
      let terrainProps = {
      	             scene:scene,
                     terrainProvider:terrainProvider,
                     u:i*size, v:(3-j)*size, uvrange:size*4,
                     lat:lat,lon:lon,lod:lod,
                     x:x+i, y:y+j, i:(i-2), j:(j-2),
                     size:size,
                     elevation:elevation,
                   };
      AWORLD_ProduceTerrainTile(terrainProps);
      return; // TODO unleash
    }
  }
}

// Temporary - improve later by waiting for tile provider to be ready TODO
function AWORLD_ProduceMap(props) {
 let terrainProvider = new Cesium.CesiumTerrainProvider({
    requestVertexNormals : true, 
    url:"https://assets.agi.com/stk-terrain/v1/tilesets/world/tiles",
  });
  setTimeout(function() { props.terrainProvider = terrainProvider; AWORLD_ProduceMap2(props); },2000);
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// AWORLD
//
// Given one or more points of view on a planetary surface in longitude and latitude
// Manufacture elevation tiles around the points of view using Cesium as an elevation tile provider
// Does some simple tile management
//
// Note:
//
// I've broken each kind of work into a separate function to avoid passing a lot of arguments in stacks.
// I chose to use an older simpler pattern as a class / namespace encapsulation of state.
// One meter == unit 1 in threejs coordinates
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//
// AWORLD class constructor
//
function AWORLD() {
  this.reset();
  this.setTerrainProvider();
  return this;
}

//
// A reset helper
// Callers are welcome to invoke this if they want to reset the state of this component
// Note there is no sharing of tiles between instances
//
AWORLD.prototype.reset(size=100,elevation=-117,lat=30.2645103,lon=-97.7438834,lod=15) {
  this.removeMeshes();
  this.size = size;
  this.elevation = elevation;
  this.povs = [];
  this.imagery = {};
  this.terrain = {};
  this.updatePOV(lat,lon,lod);
}

//
// Update everything that constitutes a scene - given a moving POV
//
AWORLD.update(scene) {

  // mark all terrain for imminent deletion
  this.markTerrain();

  // mark terrain objects around all points of view - saving some from deletion
  this.updatePOVTerrain();

  // delete all unused terrain
  this.sweepTerrain();

  // paint terrain
  Object.keys(this.terrain).forEach(function (key) {
    let blob = terrain[key];
    this.updateCesium(blob);
    this.updateGeometry(blob);
    this.updateMesh(blob);
    this.updateScene(scene,blob);
  };

}

//
// Start Cesium support
//
AWORLD.prototype.setTerrainProvider() {
  // allow a cesium terrain provider to exist (these are not conserved between AWORLD instances right now)
  if(!this.terrainProvider) {
    this.terrainProvider = new Cesium.CesiumTerrainProvider({
      requestVertexNormals : true, 
       url:"https://assets.agi.com/stk-terrain/v1/tilesets/world/tiles",
     });
  }
  return this;
}

//
// Add or update a POV
//
AWORLD.prototype.updatePOV(lat,lon,lod,index=0) {
  // convert long lat to tile index
  let position = Cesium.Cartographic.fromDegrees(lon,lat);
  let xy = terrainProvider.tilingScheme.positionToTileXY(position,lod);
  let x = xy.x;
  let y = xy.y;
  // add or update a point of view - caller has to manage their own indexes if they have more than a single pov
  let pov = {
    lat:lat,
    lon:lon,
    lod:lod,
    x:x,
    y:y
  };
  this.povs[index] = pov;
  return this;
}

//
// Mark all terrain tiles as dirty
//
AWORLD.prototype.markTerrain() {
  // mark all terrain tiles as dirty
  Object.keys(terrain).forEach(function (key) { terrain[key].age++ });
  return this;
}

//
// sweep dirty terrain TODO
//
AWORLD.prototype.sweepTerrain() {
}

//
// Make sure terrain tiles exist around POV
//
AWORLD.prototype.updatePOVTerrain() {

  // local reference to avoid js closure
  let terrain = this.terrain;

  // a rough estimate of how many terrain tiles may be visible around a pov
  let visible_tile_radius = 1;

  // a helper
  function updateTerrainHelper(pov) {
    for(let i=0;i<visible_tile_radius;i++) {
      for(let j=0;j<visible_tile_radius;j++) {
        let x = pov.x+i-Math.floor(visible_tile_radius/2);
        let y = pov.y+j-Math.floor(visible_tile_radius/2);
        if(x<0) x = 0; // TODO should wrap around
        if(y<0) y = 0; // TODO should wrap around
        // if(x>?) TODO should deal with maximum tile extent at this LOD
        // if(y>?) TODO should deal with maximum tile extent at this LOD
        let key = ""+x+"-"+y+"-"+pov.lod;
        let blob = terrain[key];
        if(!props) {
          terrain[key] = blob = {
            x:x,
            y:y,
            pov.lod,
          };
        }
        // mark as clean
        blob.age = 0;
      }
    }
  }

  // visit all points of view
  this.povs[0].forEach(updateTerrainHelper);
}

//
// Allow cesium to fetch tile data
//
AWORLD.prototype.updateTerrain(blob) {
  if(blob.loaded) return;
  blob.loaded = 1;
  Cesium.when(props.terrainProvider.requestTileGeometry(blob.x,blob.y,blob.lod),function(tile) {
    blob.loaded = 2;
    // associate cesium geometry
    blob.tile = tile;
  }).otherwise(function(error) {
    console.log('AWORLD tile fetch error occured ', error);
  });
}

//
// Make 3js geometry
//
AWORLD.prototype.updateGeometry(blob) {

  if(blob.loaded != 2) return;
  blob.loaded = 3;
  if(blob.geometry) return;

  let size = this.size;
  let elevation = this.elevation;
  let tile = blob.tile;

  if(!tile) {
    blob.geometry = new THREE.BoxGeometry(size,size,size/1000.0);
  } else {
    blob.geometry = new THREE.Geometry();
    for (var i = 0; i < tile._uValues.length; i++) {
      let x = tile._uValues[i] * size / 32767;
      let y = tile._vValues[i] * size / 32767;
      let z = (((tile._heightValues[i] * (tile._maximumHeight - tile._minimumHeight))  / 32767.0) + tile._minimumHeight ) + elevation;
      var v = new THREE.Vector3(x, y, z);
      blob.geometry.vertices.push(v);
    }
    for (var i = 0; i < tile._indices.length - 1; i = i + 3) {
      blob.geometry.faces.push(new THREE.Face3(tile._indices[i], tile._indices[i+1], tile._indices[i+2]));
    }
    blob.geometry.computeFaceNormals();
  }
}

//
// Mesh and add to scene
// TODO deal with draping images and UV
//
AWORLD.prototype.updateMesh(scene,blob) {
  if(!blob.geometry) return;
  if(blob.mesh) return;
  // separately drape image on geometry
  //threejs_recomputeuv(blob.geometry,blob.u,blob.v,blob.uvrange);
  let temp_material = new THREE.MeshPhongMaterial( {color: 0x883399} );
  blob.mesh = new THREE.Mesh(blob.geometry,temp_material); //, canvas_material);
  //props.mesh.position.set(props.i*props.size,-props.j*props.size,0);
  // TODO
  blob.scene = scene;
  scene.add(blob.mesh);
}

//
// Utility to clean the scene
//
AWORLD.prototype.removeMeshes() {
  let terrain = this.terrain;
  if(terrain) {
    Object.keys(this.terrain).forEach(function (key) {
      let blob = terrain[key];
      if(blob.scene) {
        blob.scene.remove(blob.mesh);
        blob.scene = 0;
      }
    });
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// TEST
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// A bundle of our parameters
let props = {
  lat:30.2645103,
  lon:-97.7438834,
  lod:15,
  size:100,
  elevation:-117
};

// A 3js scene if not using aframe
props.scene = threejs_init(props.size);

// A globe if not using aframe
threejs_earth(props.scene,props.lat,props.lon,props.size/4);

let world = new AWORLD();

setTimeout(updatePOV2,2000);

world.update();


/*

AFRAME.registerComponent('AWORLD', {
  schema: {},
  init: function () {},
  update: function () {},
  tick: function () {},
  remove: function () {},
  pause: function () {},
  play: function () {}
});

*/






