

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


//////////////////////////////////////////////////////////////////////////////////////////////////////////
// test code - an image loader
//////////////////////////////////////////////////////////////////////////////////////////////////////////

let canvas = 0;
let canvas2 = 0;
let ctx = 0;
let ctx2 = 0;
let canvas_material = 0;
let canvas_size = 4096;

function setupCanvas() {
  if(canvas) return;

  if(1) {
    canvas = document.createElement('canvas');
    canvas.id = "canvas";
    canvas.width = canvas_size;
    canvas.height = canvas_size;
    canvas.style.position = "absolute";
    canvas.style.left = 0;
    canvas.style.top = 0;
    canvas.style.zIndex = -1;
    //$("#canvas")[0].appendChild(canvas);
  } else {
    canvas = document.getElementById( 'canvastexture' );
  }

  // clear canvas
  ctx = canvas.getContext("2d");
  //ctx2 = canvas.getContext("2d");
  ctx.fillStyle = "#ff0000";
  ctx.fillRect(0,0,canvas.width,canvas.height);
  //ctx2.fillStyle = "#ff00ff";
  //ctx2.fillRect(0,0,canvas.width,canvas.height);
  // test content
  ctx.textAlign = "left";
  ctx.fillStyle = "#000000";
  ctx.font = "90px Arial";
  //ctx.fillText("hello",100,100);

  // trying to directly reference it from three js - fails due to a bug
  canvas_material = new THREE.MeshPhongMaterial( { color:0xffffff, wireframe:false });
  canvas_material.map = new THREE.Texture( canvas );
  canvas_material.map.needsUpdate = true;

  // older approaches to building textures
  //let texture = new THREE.TextureLoader().load(imageurl);
  //texture.needsUpdate = true;
  //tile.imageurl = imageurl;
  //tile.texture = texture;
  //let texture = new THREE.Texture( image );
  //let texture = new THREE.TextureLoader().load("uvmap.jpg");
  //let texture.needsUpdate = true;
  //tile.material = new THREE.MeshPhongMaterial({ map: tile.texture, color: 0xdddddd, wireframe: false });

}

function addToCanvas(tile) {

  // we want to paint everything to a single large canvas and use that as a source for the uv data

  // attempt #1 : this unfortunately changes the texture filter inside of webgl and corrupts the canvas so we can not export it to threejs direclty anymore
  //ctx.drawImage(tile.image,0,0,256,256);
  //canvas_material.map.needsUpdate = true;

  // attempt #2 : this doesn't work because "the operation is insecure"
  //let data = canvas.toDataURL("image/png");
  //var myimage = document.createElement('img');
  //myimage.onload = function(results) {
  //  console.log("=================hack loaded");
  //  canvas_material.map = new THREE.Texture(myimage);
  //  canvas_material.map.needsUpdate = true;
  //}
  //myimage.src = data;

  // attempt #3: get at the raw data as another way and then back convert it...  it says "the operation is insecure"
  ctx.drawImage(tile.image,tile.i*256,tile.j*256,256,256);
  //let data = ctx2.getImageData(0,0,1024,1024);
  //ctx.putImageData(data,0,0);

  return;

  // test converting it to a blob and then reloading it
  //var texture = new THREE.Texture();
  //var imageBlob = new Blob([byteArray.buffer], {type: "image/png"});
  //createImageBitmap(imageBlob).then(function(imageBitmap) {
  //    texture.image = imageBitmap;
  //    texture.needsUpdate = true;
  //});


}

function loadImages(scene,provider,lon,lat,lod) {

  let images = [];
  let position = 0;
  let xy = 0;

  console.error("why does the image scheme differ from raw queries - use hardcoded for now?");
  if(true) {
    position = Cesium.Cartographic.fromDegrees(lon,lat);
    xy = provider.tilingScheme.positionToTileXY(position, lod);
  } else {
    // because the end point cannot respond quickly enough I've bypassed it and memoized it for my testing
    position = { height: 0, latitude: 0.5282153512387369, longitude: -1.7059525890154297 };
    xy = { x: 59886, y: 154208 };
  }

  let x = xy.x;
  let y = xy.y;

  console.log("====================== image scheme");
  console.log(position);
  console.log(xy);

  /*
  I believe X will go from 59894-59899 and Y will go from 154200-154210.
  A sample URL is: https://beta.cesium.com/api/assets/3470/18/59898/154203.png?access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2MTEyZDdmYi05OTQ0LTQ3ZDAtYTAyNS1lNmFjOWMzN2JkYzUiLCJpZCI6NjksImlhdCI6MTQ4Nzc5MjM5MH0.tbT0fXHXtmMtyFPRguvjlNPupSukLUNab5pCIZgZWmw
  */

  function imageFulfill(tile) {
    tile.mime = ".png";
    tile.token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2MTEyZDdmYi05OTQ0LTQ3ZDAtYTAyNS1lNmFjOWMzN2JkYzUiLCJpZCI6NjksImlhdCI6MTQ4Nzc5MjM5MH0.tbT0fXHXtmMtyFPRguvjlNPupSukLUNab5pCIZgZWmw";

    if(false) {
      // TODO broken - the imageryProvider is providing images that are wrong in the y position....
      var p2 = imageryProvider.requestImage(x,y,lod);
      Cesium.when(p2,finalizetile).otherwise(function(error) {
        console.log('image fetch error occured ', error);
       });
      return;
    }

    // build URL for image by hand
    //https://beta.cesium.com/api/assets/3470/18/59898/154203.png?access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2MTEyZDdmYi05OTQ0LTQ3ZDAtYTAyNS1lNmFjOWMzN2JkYzUiLCJpZCI6NjksImlhdCI6MTQ4Nzc5MjM5MH0.tbT0fXHXtmMtyFPRguvjlNPupSukLUNab5pCIZgZWmw
    let imageurl = "https://beta.cesium.com/api/assets/3470/"+tile.lod+"/"+tile.x+"/"+tile.y+""+tile.mime+"?access_token="+tile.token;

    // moved this local for speed...
    imageurl = "images/"+lod+"/"+tile.x+"/"+tile.y+".png";

    if(USE_LARGE_CANVAS) {
      tile.image = new Image();
      tile.image.onload = function(results) {
        //console.log("================ got image");
        //console.log(imageurl);
        addToCanvas(tile);
      };
      tile.image.src = imageurl;
    }
  }

  // get some tiles (asynchronous)
  for(i=0;i<16;i++) {
    for(j=0;j<16;j++) {
      let image = { scene:scene, lat:lat, lon:lon, lod:lod, x:x+i, y:y+(15-j), i:i, j:j };
      images.push(image);
      imageFulfill(image);
    }
  }

  return images;
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
    scale: {type: 'number', default: 1},
  },

  init: function () {

    let scope = this;
    let lon = this.data.lon;
    let lat = this.data.lat;
    let lod = this.data.lod;
    let scale = this.data.scale;
    let scheme = tile_xy(lon,lat,lod);
    let size = this.data.size = scheme.meters_wide;
    let x = Cesium.terrainProvider.tilingScheme.getNumberOfXTilesAtLevel(lod) * (180+lon) / 360;
    let y = Cesium.terrainProvider.tilingScheme.getNumberOfYTilesAtLevel(lod) * ( 90-lat) / 180;

    x = Math.floor(x);
    y = 32767 - Math.floor(y);


    if(false) {
      // make a test cube representing a building - about 10/th the size of the area in question...
      this.geometry = new THREE.BoxBufferGeometry(size*scale/10,size*scale/10,size*scale/2); // test - will be centered rather than on edge
      this.material = new THREE.MeshPhongMaterial( {color: '#AfA'} );
      this.mesh = new THREE.Mesh(this.geometry,this.material); //, canvas_material);
      this.el.setObject3D('mesh', this.mesh);
      return;
    }

    let name = "tiles3d/"+lod+"/"+x+"/"+y+".gltf";
    console.log("building loading "+ name );
    GLTFLoader.load(name,function ( gltf ) {
      // assets are pre-rotated for use with a globe! - but this isn't our use case - so reverse that out
      gltf.scene.rotateY(-lon*Math.PI/180);
      gltf.scene.rotateY(-Math.PI/2);
      gltf.scene.rotateX(lat*Math.PI/180);
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
    //this.geometry = new THREE.BoxBufferGeometry(size*scale,size*scale,size*scale/1000); // test - will be centered rather than on edge
    this.material = new THREE.MeshPhongMaterial( {color: '#AAA'} );
    this.mesh = new THREE.Mesh(this.geometry,this.material); //, canvas_material);
    this.el.setObject3D('mesh', this.mesh);
  },

});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// aframe terrain manager
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

AFRAME.registerComponent('a-terrain', {

  schema: {
           lat: {type: 'number', default:    0},     // latitude - where to center the world and where to fetch tiles from therefore
           lon: {type: 'number', default:    0},     // longitude
           lod: {type: 'number', default:    0},     // zoom level for tiles
          size: {type: 'number', default:    0},     // where is the ground (recomputed periodically)
         scale: {type: 'number', default:    0.001}, // scaling for landscape - 1 = 1 meter
        ground: {type: 'number', default:    0},     // where is the ground (recomputed periodically)
     elevation: {type: 'number', default:  1000},    // meters above the ground should the origin be (for camera)
      pollRate: {type: 'number', default:    0},     // query user geolocation via geolocation api
  },

////////// test

  GroundResolution:function(latitude, levelOfDetail) {
    let EarthRadius = 6378137;
    let mapSize = 256 << levelOfDetail;
    return Math.cos(latitude * Math.PI / 180) * 2 * Math.PI * EarthRadius / mapSize;
  },
  LatLongToPixelXY:function(latitude, longitude, levelOfDetail) {
    function Clip(n,minValue,maxValue) { return Math.min(Math.max(n, minValue), maxValue); };
    let x = (longitude + 180) / 360; 
    let sinLatitude = Math.sin(latitude * Math.PI / 180);
    let y = 0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI);
    let mapSize = 256 << levelOfDetail;
    let pixelX = Clip(x * mapSize + 0.5, 0, mapSize - 1);
    let pixelY = Clip(y * mapSize + 0.5, 0, mapSize - 1);
    return [ pixelX, pixelY ];
  },
//////////////

  init: function() {
    let scope = this;

    // TEST
    //setupCanvas();
    //loadImages(scene,imageryProvider,lon,lat,18);

//let g = this.GroundResolution(this.data.lat,this.data.lod);
//console.log("Ground Resolution at this LOD for bing images is = "+g);
//let p = this.LatLongToPixelXY(this.data.lat,this.data.lon,this.data.lod);
//console.log(p);

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

  updateTile: function(data,x,y) {
    // Add tiles as needed
    try {
      let lat = data.lat;
      let lon = data.lon;
      let lod = data.lod;
      let scale = data.scale;
      let ground = data.ground;
      let size = data.size;
      // define a unique key per integer tile index
      let key = "tile-"+x+"-"+y+"-"+lod;
      // find tile if made
      let tile = this.el.querySelector("#"+key);
      if(!tile) {
        // make tile if needed
        let element = document.createElement('a-entity');
        element.setAttribute('id',key);
        element.setAttribute('a-tile', { x:x, y:y, lod:lod, size:size, scale:scale });
        element.setAttribute('position', { x:x*size*scale, y:-y*size*scale, z:0} );
        this.el.appendChild(element);
        // make building also (unfortunately it needs to know approximate latitude and longitude to unrotate frame of reference)
        element = document.createElement('a-entity');
        element.setAttribute('id',key);
        element.setAttribute('a-building',{ lat:lat, lon:lon, lod:lod, x:x, y:y, size:size, scale:scale });
        element.setAttribute('position', { x:(x+0.5)*size*scale, y:-(y-0.5)*size*scale, z:0*scale} );
        element.setAttribute('scale', {x:scale, y:scale, z:scale });
        this.el.appendChild(element);
      }
    } catch(e) { console.error(e); };
  },

  updateTilesAll: function(xy) {
    try {
      let data = this.data;
      let lat = data.lat;
      let lon = data.lon;
      let lod = data.lod;
      let size = data.size;
      // TODO improve region to paint determination
      for(let i = -2; i<2;i++) {
        for(let j = -2; j<2;j++) {
          i = j = 0;
          this.updateTile(data,data.xy.x+i,data.xy.y+j);
          return;
        }
      }
    } catch(e) { console.error(e); };
  },

  updatePose: function() {
    // Update world position such that current lon lat and elevation is at 0,0,0
    // cannot take advantage of memoized this.data because it can be called out of band
    try {
      let data = this.data;
      let lat = data.lat;
      let lon = data.lon;
      let lod = data.lod;
      let scale = data.scale;
      let elevation = data.elevation;
      let ground = data.ground;
      let schema = tile_xy(lon,lat,lod);
      let size = data.size = schema.meters_wide;
      let x = Cesium.terrainProvider.tilingScheme.getNumberOfXTilesAtLevel(lod) * (180+lon) / 360;
      let y = Cesium.terrainProvider.tilingScheme.getNumberOfYTilesAtLevel(lod) * ( 90-lat) / 180;
      // the parent gets centered at this latitude and longitude; having the net effect of having tiles at that lat lon overlap 0,0,0
      // have to adjust Y one tile over for various fiddly reasons
      this.el.setAttribute('position', { x:-x*size*scale, y:y*size*scale-size*scale, z:-(ground+elevation)*scale });
    } catch(e) { console.error(e); };
  },

  updateAll: function() {
    let scope = this;
    let data = this.data;
    let lat = data.lat;
    let lon = data.lon;
    let lod = data.lod;
    let scale = data.scale;

    // get ground height
    let pointOfInterest = Cesium.Cartographic.fromDegrees(lon,lat);
    Cesium.sampleTerrain(Cesium.terrainProvider, lod,[pointOfInterest]).then(function(groundResults) {

      // set ground height for entire world (distance of pov from tile geometry)
      data.ground = groundResults[0].height;

      // get pov fractional tile coordinates directly - bypassing cesium because fractional coordinates are desired
      let schema = tile_xy(lon,lat,lod);
      let x = data.x = Cesium.terrainProvider.tilingScheme.getNumberOfXTilesAtLevel(lod) * (180+lon) / 360;
      let y = data.y = Cesium.terrainProvider.tilingScheme.getNumberOfYTilesAtLevel(lod) * ( 90-lat) / 180;

      //let xy = Cesium.terrainProvider.tilingScheme.positionToTileXY(pointOfInterest,lod); // <- this is the correct way as per tile provider
      let xy = data.xy = { x:Math.floor(x), y:Math.floor(y) };
      console.log("centering at " + xy.x + " " + xy.y);

      // re-get spatial coverage of a tile at this LOD in meters and remember it (TODO can do this by asking Cesium instead also?)
      let size = data.size = schema.meters_wide;

      // now paint all
      scope.updateTilesAll(xy);

      // and move pov
      scope.updatePose();

    });
    // optional - force an extra (inaccurate) update immediately because I'd like to not wait for the terrain sampling to return
    scope.updatePose();
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
      let angle = camera.getAttribute('rotation').y;
      let position = camera.getAttribute('position');
      //console.log("camera is at x="+position.x+" y="+position.y+" z="+position.z+" angle="+angle);
      let stride = 0.001; // TODO compute
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

- images
    - get the exact longitude latitude extents of my tile
    - ask cesium for all those tiles
    - ideally getting 4 - at the closest larger extent
    - paint those 4 - can use a shader if i wish


- get buildings to be exact as well; something is wrong with building index

- tighter controls for navigation

top down mode
  - render all tiles around the lon,lat
  - on select and drag ; at the specific zoom we are at there is a pixel displacement exactly equal to some long lat; we can stay in whatever coords work
  - on pinch zoom; there is a specific relationship between pinch points and zoom... 
  - switch lods at different zoom levels
      - at some distance you can see all tiles; basically the triangle formed by the fov and the width
      - when the fov is < 1/2 of that it seems to make sense to zoom...
      - so i can calculate the best lod for any visible width ...


*/


