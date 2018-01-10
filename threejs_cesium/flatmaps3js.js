
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

// Low level helper to convert Cesium geometry to threejs geometry
function AWORLD_Terrain2Mesh(t,tile_size,tile_elevation) {

  if(!t) {
    return new THREE.BoxGeometry( tile_size, tile_size, tile_size/1000 );
  }

  var geo = new THREE.Geometry();
  for (var i = 0; i < t._uValues.length; i++) {
    let x = t._uValues[i];
    let y = t._vValues[i];
    let z = ((t._heightValues[i] * (t._maximumHeight - t._minimumHeight))  / 32767.0) + t._minimumHeight;

    x = x*tile_size/32767;
    y = y*tile_size/32767;
    z = z - 115; // + tile_elevation; TODO fix

    var v = new THREE.Vector3(x, y, z);
    geo.vertices.push(v);
  }
  for (var i = 0; i < t._indices.length - 1; i = i + 3) {
    geo.faces.push(new THREE.Face3(t._indices[i], t._indices[i+1], t._indices[i+2]));
  }
  geo.computeFaceNormals(); 

  return geo;

}

// Get Cesium Data and Manufacture 3js geometry and add to scene if any
function AWORLD_ProduceTerrainTileIntoScene(props) {
  Cesium.when(props.terrainProvider.requestTileGeometry(props.x,props.y,props.lod),function(cesiumTile){
  	props.cesiumTile = cesiumTile;
    props.geometry = AWORLD_Terrain2Mesh(props.cesiumTile,props.size,props.elevation);
    //threejs_recomputeuv(props.geometry,props.u,props.v,props.uvrange);
    let temp_material = new THREE.MeshBasicMaterial( {color: 0xffff00} );
    props.mesh = new THREE.Mesh(props.geometry,temp_material); //, canvas_material);
    // TODO I want to place these absolutely
    //props.mesh.position.set(props.i*props.size,-props.j*props.size,0);
	if(props.scene) {
  	  props.scene.add(props.mesh);
    }
  }).otherwise(function(error) {
    console.log('AWORLD tile fetch error occured ', error);
  });
}

// Convert a longitude and latitude to an elevation terrain tile xy index and then request loading of renderable data around that location
function AWORLD_ProduceMapIntoScene(props) {

  let lat = props.lat;
  let lon = props.lon;
  let lod = props.lod;
  let size = props.size;
  let elevation = props.elevation;
  let scene = props.scene;

  // Cesium Terrain Elevation Provider
  let terrainProvider = new Cesium.CesiumTerrainProvider({
    requestVertexNormals : true, 
    url:"https://assets.agi.com/stk-terrain/v1/tilesets/world/tiles",
  });

  // TODO wait

  // Get cesium tile index
  let position = 0;
  let xy = 0;
  if(FALSE) {
    position = Cesium.Cartographic.fromDegrees(lon,lat);
    xy = provider.tilingScheme.positionToTileXY(position,lod);
  } else {
    // because the end point cannot respond quickly enough I've bypassed it and memoized it for my testing
    position = { height: 0, latitude: 0.5282153512387369, longitude: -1.7059525890154297 };
    xy = { x: 14972, y: 10872 };
  }

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
      AWORLD_ProduceTerrainTileIntoScene(terrainProps);
      return; // TODO unleash
    }
  }
}

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

  let renderer = new THREE.WebGLRenderer({alpha:true});
  renderer.setSize(width, height);
  //renderer.setClearColor (0xff0000, 1);
  let controls = new THREE.TrackballControls(camera); 
  controls.target.set(0,0,0);
  document.getElementById('webgl').appendChild(renderer.domElement);

  function render() {
    controls.update();    
    requestAnimationFrame(render);
    renderer.render(scene, camera);
  }
  render();

  let axes = new THREE.AxisHelper(2000000);
  scene.add(axes);

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
    sphere.position.set(0,0,distance/2);
    scene.add( sphere )
  }

  return scene;
}

function threejs_earth(scene,lat,lon,size) {

  {
    // earth representation
    let geometry = new THREE.SphereGeometry( size, 32, 32 );
    let material = new THREE.MeshBasicMaterial( {color: 0xffffff} );
    material.map    = THREE.ImageUtils.loadTexture('earth.jpg')
    let sphere = new THREE.Mesh( geometry, material );
    scene.add( sphere );
  }

  { // green dot marking north pole
    let geometry = new THREE.SphereGeometry( 1, 32, 32 );
    let material = new THREE.MeshBasicMaterial( {color: 0x00ff00 } );
    let sphere = new THREE.Mesh( geometry, material );
    sphere.position.set( 0, size,0 );
    scene.add( sphere );
  }

  { // red dot marking a longitude and latitude on said globe
    let geometry = new THREE.SphereGeometry( 3, 32, 32 );
    let material = new THREE.MeshBasicMaterial( {color: 0xff0000 } );
    let sphere = new THREE.Mesh( geometry, material );
    let v = ll2vector(lat,lon,size);
    sphere.position.set(v[0],v[1],v[2]);
    scene.add( sphere );
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// This is a sample application that lets a player walk around and fetches new tiles in a visible region around them
// Rather than having a tile manager at a lower level the tile management is done here.
// One meter == 1 in game world coordinates
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// A bundle of our parameters
let props = {
	lat:30.2645103,
	lon:-97.7438834,
	lod:15,
	size:100,
	elevation:0,
};

// A 3js scene if not using aframe
props.scene = threejs_init(props.size);

// A globe if not using aframe
//threejs_decorators(props.scene,props.lat,props.lon,props.size/4);

// Begin a callback process that will populate terrain into the scene at longitude latitude specified in the props
AWORLD_ProduceMapIntoScene(props);


// TODO - place viewer and tiles absolutely
// TODO - add a listener for input events and keep fetching new tiles there
// TODO - throw away old tiles
// TODO - deal with wrap around
