

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
// GLTF load helper for buildings
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var GLTFLoader = new THREE.GLTFLoader();

AFRAME.registerComponent('a-buildings', {

  schema: {
    lat: {type: 'number', default: 30.2645103},
    lon: {type: 'number', default: -97.7438834},
    lod: {type: 'number', default: 15},
    x: {type: 'number', default: 14000},
    y: {type: 'number', default: 10000},
  },

  init: function () {
    let scope = this;
    let tile = data;
    let size = tile_extent(tile.lod).meters_wide;
    let name = "../tiles3d/"+tile.lod+"/"+tile.x+"/"+tile.y+".gltf";
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
      this.el.setObject3D('mesh', this.mesh);
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
//  - arranged on the x/z plane
//  - not stretched vertically
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

Cesium.terrainProvider = new Cesium.CesiumTerrainProvider({
  requestVertexNormals : true, 
  url:"https://assets.agi.com/stk-terrain/v1/tilesets/world/tiles",
});

AFRAME.registerComponent('a-tile', {
  schema: {
    x: {type: 'number', default: 14000},
    y: {type: 'number', default: 10000},
    lod: {type: 'number', default: 15},
  },
  init: function () {
    let scope = this;
    let x = this.data.x;
    let y = this.data.y;
    let lod = this.data.lod;
    Cesium.when(Cesium.terrainProvider.requestTileGeometry(x,y,lod),function(tile){scope.makeGeometry(tile)}).otherwise(function(error) {
      console.error(error);
    });
  },
  makeGeometry:function(tile) {
    let x = this.data.x;
    let y = this.data.y;
    let lod = this.data.lod;
    let size = tile_extent(lod).meters_wide;
    let geometry = new THREE.Geometry();
    for (let i=0; i<tile._uValues.length; i++) {
      let vx = tile._uValues[i]*size/32767;
      let vy = tile._vValues[i]*size/32767;
      let vz = (((tile._heightValues[i]*(tile._maximumHeight-tile._minimumHeight))/32767.0)+tile._minimumHeight);
      var v = new THREE.Vector3(vx,vz,1-vy); // rotate in place in vertex data
      geometry.vertices.push(v);
    }
    for (let i=0; i<tile._indices.length-1; i=i+3) {
      geometry.faces.push(new THREE.Face3(tile._indices[i], tile._indices[i+1], tile._indices[i+2]));
    }
    geometry.computeFaceNormals();
    // separately drape image on geometry
    //threejs_recomputeuv(this.geometry,this.u,this.v,this.uvrange);
    this.material = new THREE.MeshPhongMaterial( {color: '#AAA'} );
    this.mesh = new THREE.Mesh(geometry,this.material); //, canvas_material);
    this.el.setObject3D('mesh', this.mesh);
    this.el.setAttribute('position',{x:x*size,y:0,z:y*size});
  },

});


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// aframe terrain manager
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

AFRAME.registerComponent('a-terrain', {

  schema: {
    lat: {type: 'number', default: 30.2645103},
    lon: {type: 'number', default: -97.7438834},
    lod: {type: 'number', default: 15},
    elevation: {type: 'number', default: 15},
    // these fields are re-generated
    stride: {type: 'number', default: 0.001},
  },

  init: function() {
    this.getLocation();
    this.getUserInput();
  },

  updateCenter: function(data) {
    let scope = this;
    let lon = data.lon;
    let lat = data.lat;
    let lod = data.lod;
    Cesium.when(Cesium.terrainProvider.readyPromise).then(function() {
      try {
        let pointOfInterest = Cesium.Cartographic.fromDegrees(lon,lat);
        // where is the ground at this point?
        Cesium.sampleTerrain(Cesium.terrainProvider, lod,[pointOfInterest]).then(function(results) {
          let ground = results[0].height;
          let size = tile_extent(lod).meters_wide;
          let hotairballoon = 20;
          // offset all the tiles such that the latitude and longitude are at 0,0,0
          // let xy = Cesium.terrainProvider.tilingScheme.positionToTileXY(pointOfInterest,lod);
          let x = Cesium.terrainProvider.tilingScheme.getNumberOfXTilesAtLevel(lod) * (180+lon) / 360;
          let y = Cesium.terrainProvider.tilingScheme.getNumberOfYTilesAtLevel(lod) * ( 90-lat) / 180;
          let f = Math.floor(y); // TODO hack - the fractional component is going in the wrong direction ... fix later
          scope.el.setAttribute('position',{x:-x*size,y:-ground-hotairballoon,z:-f*size+(y-f)*size});
        });
      } catch(e) {
        alert(e);
      }
    });

  },

  updateTiles: function(data) {
    let scope = this;
    let lat = data.lat;
    let lon = data.lon;
    let lod = data.lod;
    Cesium.when(Cesium.terrainProvider.readyPromise).then(function() {
      try {
        //let pointOfInterest = Cesium.Cartographic.fromDegrees(lon,lat);
        //let xy = Cesium.terrainProvider.tilingScheme.positionToTileXY(pointOfInterest,lod);
        let x = Cesium.terrainProvider.tilingScheme.getNumberOfXTilesAtLevel(lod) * (180+lon) / 360;
        let y = Cesium.terrainProvider.tilingScheme.getNumberOfYTilesAtLevel(lod) * ( 90-lat) / 180;
        let xy = { x:Math.floor(x), y:Math.floor(y) };
        let key = "tile-"+(xy.x)+"-"+(xy.y)+"-"+lod;
        let tile = scope.el.querySelector("#"+key);
        if(!tile) {
          let element = document.createElement('a-entity');
          element.setAttribute('id',key);
          element.setAttribute('a-tile',{x:xy.x,y:xy.y,lod:lod});
          scope.el.appendChild(element);
        }
      } catch(e) {
        alert(e);
      }
    });

  },

  getLocation: function() {
    return;
    if(!navigator.geolocation) return;
    let scope = this;
    navigator.geolocation.getCurrentPosition(function(results) {
      if(scope.locationCount>99) return;
      scope.locationCount = scope.locationCount ? scope.locationCount + 1 : 1;
      scope.data.lon = results.coords.longitude;
      scope.data.lat = results.coords.latitude;
      scope.updateTiles(scope.data);
      scope.updateCenter(scope.data);
    });
  },

  getUserInput: function() {
    let scope = this;

    var pos = document.querySelector('#camera').getAttribute('position');
    var rot = document.querySelector('#camera').getAttribute('rotation');
    console.log(rot.y + " " + rot.x + " " + rot.z);
    // should probably use camera to feed the navigation system...

    window.addEventListener("keydown", function(e) {
      switch(e.keyCode) {
        case 74: scope.data.lon -= scope.data.stride; break; //left k
        case 73: scope.data.lat += scope.data.stride; break; //up i
        case 75: scope.data.lon += scope.data.stride; break; //right k
        case 77: scope.data.lat -= scope.data.stride; break; //down m
        //case 37: scope.data.lon -= scope.data.stride; break; //left
        //case 38: scope.data.lat += scope.data.stride; break; //up
        //case 39: scope.data.lon += scope.data.stride; break; //right
        //case 40: scope.data.lat -= scope.data.stride; break; //down
      }
      scope.updateTiles(scope.data);
      scope.updateCenter(scope.data);
    });
  }

});


/*

moving around
  - get the camera orientation on the y axis
  - changes

todo picky details around positioning

  - fractional component of center is backwards... examine

  - use camera heading to estimate new longitude and latitude to move by

  - use current lod to estimate stride

  - may have to do ground intersection tests to be precisely on the ground; examine; need to carefully validate current lat lon coordinates
    drop some objects on terrain and validate against objective data

next

  - turn buildings back on
  - turn terrain back on
  - 

*/


