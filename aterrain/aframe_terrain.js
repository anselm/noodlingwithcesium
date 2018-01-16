

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

// https://cesium.com/blog/2015/08/10/introducing-3d-tiles/
// http://blog.mastermaps.com/2014/10/3d-terrains-with-cesium.html


function ll2vector(lat,lon,r=1) {
  let phi = (90-lat)*(Math.PI/180)
  let theta = (lon+180)*(Math.PI/180)
  x = -r*Math.sin(phi)*Math.cos(theta);
  z = r*Math.sin(phi)*Math.sin(theta);
  y = r*Math.cos(phi);
  return [x,y,z]
}

function tile_extent(lod) {
  let scheme = {};
  scheme.lod = lod;
  scheme.w = Math.pow(2,lod+1);
  scheme.h = Math.pow(2,lod);
  scheme.ntiles = scheme.w*scheme.h;
  scheme.wdeg = 360 / scheme.w;
  scheme.hdeg = 180 / scheme.h;
  scheme.meters_wide = 40070000 / scheme.w;
  scheme.meters_tall = 39000000 / scheme.h; // TODO this may be wrong
  return scheme;
}

function tile_lonlat(x,y,lod) {
  let scheme = tile_extent(lod);
  scheme.x = x;
  scheme.y = y;
  scheme.lon = 360 * x / scheme.w;
  scheme.lat = 180 * y / scheme.h; // TODO verify
  return scheme;
}

function tile_xy(lon,lat,lod) {
  let scheme = tile_extent(lod);
  scheme.lon = lon;
  scheme.lat = lat;
  scheme.x = (180+lon) * scheme.w / 360;
  scheme.y = ( 90-lat) * scheme.h / 180;
  return scheme;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// aframe long lat positioned feature
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

AFRAME.registerComponent('a-ll', {
  schema: {
    lat: {type: 'number', default: 0},
    lon: {type: 'number', default: 0},
    lod: {type: 'number', default: 0},
    elevation: {type: 'number', default: 0},
  },
  init: function() {
    let lon = this.data.lon;
    let lat = this.data.lat;
    let lod = this.data.lod;
    let elevation = this.data.elevation;
    let schema = tile_xy(lon,lat,lod);
    let size = schema.meters_wide;
    let x = schema.x*size;
    let y = schema.y*size;
    console.log(" x="+x+" y="+y+" elevation="+elevation);
    this.el.setAttribute('position',{x:x,y:elevation,z:y});
  },
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// GLTF load helper for buildings
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var GLTFLoader = new THREE.GLTFLoader();

AFRAME.registerComponent('a-building', {

  schema: {
    lat: {type: 'number', default: 30.2645103},
    lon: {type: 'number', default: -97.7438834},
    lod: {type: 'number', default: 15},
    x: {type: 'number', default: 14974},
    y: {type: 'number', default: 21891},
  },

  init: function () {
    let scope = this;
    let tile = this.data;
    let size = tile_extent(tile.lod).meters_wide;
    let name = "tiles3d/"+tile.lod+"/"+tile.x+"/"+tile.y+".gltf";
    GLTFLoader.load(name,function ( gltf ) {

      // assets are pre-rotated for use with a globe - but this isn't our use case - so reverse that out
      gltf.scene.rotateY(-tile.lon*Math.PI/180);
      gltf.scene.rotateY(-Math.PI/2);
      gltf.scene.rotateX(tile.lat*Math.PI/180);
      // adjust the size to match the parent
      // TODO I think we will be able to remove this when 1 = 1 meter
      let extents = tile_extent(tile.lod);
      let block_scale = size/extents.meters_wide;
      console.log("we believe this block is in units that are this many meters wide total" + extents.meters_wide);
      console.log("so we believe that to get to the same scale as terrain we need this value " + block_scale);
      gltf.scene.scale.set(block_scale,block_scale,block_scale);
      scope.el.setObject3D('mesh',gltf.scene);
    },
    function ( xhr ) {
      //console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
    },
    function ( error ) {
      console.log( 'An error happened' );
      console.log(error);
    });
  }
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// aframe tile
//  - in meters
//  - not centered, their internal extent starts at 0,0,0 and end at size,size,size
//  - placed absolutely in space in meters on a huge sheet extending world width and height
//  - arranged on the x/y plane
//  - not stretched vertically (one meter == 1 unit)
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

Cesium.terrainProvider = new Cesium.CesiumTerrainProvider({
  requestVertexNormals : true, 
  url:"https://assets.agi.com/stk-terrain/v1/tilesets/world/tiles",
});

AFRAME.registerComponent('a-tile', {
  schema: {
      x: {type: 'number', default: 0},
      y: {type: 'number', default: 0},
    lod: {type: 'number', default: 0},
   size: {type: 'number', default: 0},
  scale: {type: 'number', default: 1},
  },
  init: function () {
    let scope = this;
    let x = this.data.x;
    let y = this.data.y;
    let lod = this.data.lod;
    Cesium.when(Cesium.terrainProvider.readyPromise).then(function() {
      Cesium.when(Cesium.terrainProvider.requestTileGeometry(x,y,lod),function(tile){scope.makeGeometry(tile)}).otherwise(function(error) {
        console.error(error);
      });
    });
  },
  makeGeometry:function(tile) {
    let x = this.data.x;
    let y = this.data.y;
    let lod = this.data.lod;
    let size = this.data.size; // tile_extent(lod).meters_wide; <- although tempting it is best not to sidestep cesium at a low level here
    let scale = this.data.scale;
    this.geometry = new THREE.Geometry();
    for (let i=0; i<tile._uValues.length; i++) {
      let vx = tile._uValues[i]*size/32767*scale;
      let vy = tile._vValues[i]*size/32767*scale;
      let vz = (((tile._heightValues[i]*(tile._maximumHeight-tile._minimumHeight))/32767.0)+tile._minimumHeight)*scale;
      var v = new THREE.Vector3(vx,vy,vz);
      this.geometry.vertices.push(v);
    }
    for (let i=0; i<tile._indices.length-1; i=i+3) {
      this.geometry.faces.push(new THREE.Face3(tile._indices[i], tile._indices[i+1], tile._indices[i+2]));
    }
    this.geometry.computeFaceNormals();
    // separately drape image on geometry
    //threejs_recomputeuv(this.geometry,this.u,this.v,this.uvrange);
    //this.geometry = new THREE.BoxBufferGeometry(1,1,1);
    this.material = new THREE.MeshPhongMaterial( {color: '#AAA'} );
    this.mesh = new THREE.Mesh(this.geometry,this.material); //, canvas_material);
    this.el.setObject3D('mesh', this.mesh);
    console.log("made tile");
  },

});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// aframe terrain manager
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

AFRAME.registerComponent('a-terrain', {

  schema: {
           lat: {type: 'number', default:    0}, // latitude - where to center the world and where to fetch tiles from therefore
           lon: {type: 'number', default:    0}, // longitude
           lod: {type: 'number', default:    0}, // zoom level for tiles
          size: {type: 'number', default:    0}, // where is the ground (recomputed periodically)
         scale: {type: 'number', default: 0.01}, // scaling for landscape - 1 = 1 meter
        ground: {type: 'number', default:    0}, // where is the ground (recomputed periodically)
     elevation: {type: 'number', default:  100}, // meters above the ground should the origin be (for camera)
      pollRate: {type: 'number', default:    0}, // query user geolocation via geolocation api
  },

  init: function() {
    let scope = this;
    // wait for cesium and then render current focus
    Cesium.when(Cesium.terrainProvider.readyPromise).then(function(){
      // add listeners to poll user location periodically at specified rate
      scope.getLocation();
      // temporary - add listeners for user input for now (this may be removed - it acts as a helper for debugging)
      scope.getUserInput();
      // Goto this position, updating tiles and generally showing a view here
      scope.updateAll();
    });
  },

  updateTile: function() {
    // Add tiles as needed
    try {
      let data = this.data;
      let lat = data.lat;
      let lon = data.lon;
      let lod = data.lod;
      let scale = data.scale;
      let elevation = data.elevation;
      let ground = data.ground;
      // slight hack: use my own computation of cesium tile offsets to calculate unit size of tile in meters - cesium doesn't expose this?
      let schema = tile_xy(lon,lat,lod);
      let size = data.size = schema.meters_wide;
      // get exact cesium tile index with fractional component - cannot use the cesium call here as it truncates to integer boundary
      //let xy = Cesium.terrainProvider.tilingScheme.positionToTileXY(pointOfInterest,lod);
      let x = Cesium.terrainProvider.tilingScheme.getNumberOfXTilesAtLevel(lod) * (180+lon) / 360;
      let y = Cesium.terrainProvider.tilingScheme.getNumberOfYTilesAtLevel(lod) * ( 90-lat) / 180;
      let xy = { x:Math.floor(x), y:Math.floor(y) };
      // define a unique key per integer tile index
      let key = "tile-"+(xy.x)+"-"+(xy.y)+"-"+lod;
      // find tile if made
      let tile = this.el.querySelector("#"+key);
      // else make tile if not found
      if(!tile) {
        let element = document.createElement('a-entity');
        element.setAttribute('id',key);
        element.setAttribute('a-tile', { x:xy.x, y:xy.y, lod:lod, size:size, scale:scale });
        element.setAttribute('position', { x:xy.x*size*scale, y:-xy.y*size*scale, z:0} );
        this.el.appendChild(element);
      }
    } catch(e) { console.error(e); };
  },

  updatePose: function() {
    // Update world position such that current lon lat and elevation is at 0,0,0
    try {
      let data = this.data;
      let lat = data.lat;
      let lon = data.lon;
      let lod = data.lod;
      let scale = data.scale;
      let elevation = data.elevation;
      let ground = this.data.ground;
      let schema = tile_xy(lon,lat,lod);
      let size = this.data.size = schema.meters_wide;
      let x = Cesium.terrainProvider.tilingScheme.getNumberOfXTilesAtLevel(lod) * (180+lon) / 360;
      let y = Cesium.terrainProvider.tilingScheme.getNumberOfYTilesAtLevel(lod) * ( 90-lat) / 180;
      // the parent gets centered at this latitude and longitude; having the net effect of having tiles at that lat lon overlap 0,0,0
      // have to adjust Y one tile over for various fiddly reasons
      this.el.setAttribute('position', { x:-x*size*scale, y:y*size*scale-size*scale, z:-(ground+elevation)*scale });
      console.log("ground is at "+this.data.ground);
    } catch(e) { console.error(e); };
  },

  updateAll: function() {
    // Fetch tiles into this terrain object at the specified lon/lat
    let scope = this;
    let lat = this.data.lat;
    let lon = this.data.lon;
    let lod = this.data.lod; 
    let pointOfInterest = Cesium.Cartographic.fromDegrees(lon,lat);
    Cesium.sampleTerrain(Cesium.terrainProvider, lod,[pointOfInterest]).then(function(groundResults) {
      scope.data.ground = groundResults[0].height;
      scope.updateTile();
      scope.updatePose();
    });
  },

  getLocation: function() {
    if(!navigator.geolocation) return;
    if(!this.data.pollRate) return;
    let scope = this;
    navigator.geolocation.getCurrentPosition(function(results) {
      if(scope.locationCount>99) return;
      scope.locationCount = scope.locationCount ? scope.locationCount + 1 : 1;
      scope.data.lon = results.coords.longitude;
      scope.data.lat = results.coords.latitude;
      scope.updateAll();
    });
  },

  getUserInput: function() {
    let scope = this;
    window.addEventListener("keydown", function(e) {
      let camera = document.querySelector('#camera');
      if(!camera) {
        console.error("No camera setup with id #camera");
        return;
      }
      let stride = 0.001;
      switch(e.keyCode) {
        case 73: scope.data.lat += stride; break;
        case 74: scope.data.lon -= stride; break;
        case 75: scope.data.lon += stride; break;
        case 77: scope.data.lat -= stride; break;
      }
      /*
      if(camera && e.keyCode == 32) {
        let angle = camera.getAttribute('rotation').y;
        let position = camera.getAttribute('position');
        console.log("camera is at x="+position.x+" y="+position.y+" z="+position.z+" angle="+angle);
        let stride = 0.001;// TODO FIX
        scope.data.lon -= Math.sin(angle*Math.PI/180) * stride;
        scope.data.lat += Math.cos(angle*Math.PI/180) * stride;
      }
      */
      //if(e.keyCode == 74) scope.data.elevation -= 10;
      //if(e.keyCode == 75) scope.data.elevation += 10;
      scope.updateAll();
    });
  }

});


/*

  * tiles are now apparently vertical again

  - i could look at where the camera is on x,y and use that to estimate lat lon
  - or i can just have a tile mover,

  - can i drive the system north or south etc

 - rejigger things to use the XY plane again
  - 


 - see if we can get the buildings back up and terrain




- get back to original map features

- get slippy map stuff up


    - demo for mozilla

      - can we get some slippy map stuff up?
      - probably a top down view is ok; but maybe allow zooming and tilting
      - really need to show buildings



  * map

    - turn on buildings

    - arrange map facing view
    - top down drag slides map - i think i will not move the camera at all
    - two finger zoom 
    - have some kind of rotate/look mechanic; needs a specific way of turning off or on



top down mode
  - render all tiles around the lon,lat
  - on select and drag ; at the specific zoom we are at there is a pixel displacement exactly equal to some long lat; we can stay in whatever coords work
  - on pinch zoom; there is a specific relationship between pinch points and zoom... 
  - switch lods at different zoom levels
      - at some distance you can see all tiles; basically the triangle formed by the fov and the width
      - when the fov is < 1/2 of that it seems to make sense to zoom...
      - so i can calculate the best lod for any visible width ...

todo other
  - there is a delay moving due to tile load
  - add buildings
  - add images
  - compute stride 


*/


