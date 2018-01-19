

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
// test images
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

class ImageServer {
  constructor() {
    Cesium.imageProvider = new Cesium.BingMapsImageryProvider({
        url : 'https://dev.virtualearth.net',
        key : 'RsYNpiMKfN7KuwZrt8ur~ylV3-qaXdDWiVc2F5NCoFA~AkXwps2-UcRkk2L60K5qBy5kPnTmwvxdfwl532NTheLdFfvYlVJbLnNWG1iC-RGL',
        mapStyle : Cesium.BingMapsStyle.AERIAL
    });
  }
  ready(callback) {
    Cesium.when(Cesium.imageProvider.readyPromise).then(callback);
  }
  metersWide(lod) {
    // https://msdn.microsoft.com/en-us/library/bb259689.aspx
    let EarthRadius = 6378137;
    let EarthCircumference = 40054700.36; // 2*Math.PI*EarthRadius;
    let tilesWide = 2 << lod;
    return EarthCircumference/tilesWide;
  }
  groundResolution(latitude, levelOfDetail) {
    let EarthRadius = 6378137;
    let EarthCircumference = 40054700.36; // 2*Math.PI*EarthRadius;
    let mapSize = 256 << levelOfDetail;
    return Math.cos(latitude * Math.PI / 180) * EarthCircumference / mapSize;
  }
  /*
  LatLongToPixelXY(latitude, longitude, levelOfDetail) {
    function Clip(n,minValue,maxValue) { return Math.min(Math.max(n, minValue), maxValue); };
    let x = (longitude + 180) / 360; 
    let sinLatitude = Math.sin(latitude * Math.PI / 180);
    let y = 0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI);
    let mapSize = 256 << levelOfDetail;
    let pixelX = Clip(x * mapSize + 0.5, 0, mapSize - 1);
    let pixelY = Clip(y * mapSize + 0.5, 0, mapSize - 1);
    return [ pixelX, pixelY ];
  },
  */

  scratchpad() {
    let size = 256; // bing tile size
    let canvas = document.createElement('canvas');
    canvas.id = "canvas";
    canvas.width = size;
    canvas.height = size;
    canvas.style.position = "absolute";
    canvas.style.left = 0;
    canvas.style.top = 0;
    canvas.style.zIndex = -1;
    canvas.ctx = canvas.getContext("2d");
    //canvas.ctx.fillStyle = "#0000ff";
    //canvas.ctx.fillRect(0,0,size,size);
    canvas.paint = function(image,extent) {
      canvas.ctx.drawImage(image,extent.x1,extent.y1,extent.x2-extent.x1,extent.y2-extent.y1);
    }
    canvas.material = function() {
      let material = new THREE.MeshPhongMaterial( { color:0xffffff, wireframe:false });
      material.map = new THREE.Texture(canvas);
      material.map.needsUpdate = true;
      return material;
    }
    return canvas;
  }

  getExtent(lat,lon,lod,offset) {
    // get the extent of a terrain tile overlapping this coordinate
    let poi = Cesium.Cartographic.fromDegrees(lon,lat);
    let txy = Cesium.terrainProvider.tilingScheme.positionToTileXY(poi,lod);
    let tr = Cesium.terrainProvider.tilingScheme.tileXYToRectangle(txy.x,txy.y,lod);

    // get the extent of an image tile overlapping this coordinate
    let ixy = Cesium.imageProvider.tilingScheme.positionToTileXY(poi,lod);
    ixy.y += offset;
    let ir = Cesium.imageProvider.tilingScheme.tileXYToRectangle(ixy.x,ixy.y,lod);

    // the width and height of the pixel buffer is as so
    let pixels = 256;

    // basically ( image northern latitude relative to terrain tile northern latitude ) * pixel height / ( terrain tile latitude extent )
    let x1 = 0;
    let x2 = pixels;
    let y1 = (tr.north - ir.north) * pixels / (tr.north-tr.south);
    let y2 = (tr.north - ir.south) * pixels / (tr.north-tr.south);

    let extents = {
      lod:lod,
      ixy:ixy,
      x1:x1,
      y1:y1,
      x2:x2,
      y2:y2,
    }
    return extents;
  }

  makePromise(scratch,extent,resolve) {
    let promise = function() {
      let request = Cesium.imageProvider.requestImage(extent.ixy.x,extent.ixy.y,extent.lod);
      Cesium.when(request,function(image) {
        scratch.paint(image,extent);
        if(resolve)resolve();
      });
    };
    return promise;
  }

  getImageMaterial(lat,lon,lod,callback) {

    // get a canvas (a basic canvas and a couple of helper methods I tacked onto it)
    let scratch = this.scratchpad();

    // this will be called last in the chain built below - it will return a nice material to the caller
    let promise = function() {
      callback(scratch.material());
    };

    for(let i = -2; i < 3; i++) {
      // consider image extents that may overlap the tile extent that needs to be fully painted
      let extent = this.getExtent(lat,lon,lod,i);
      if(extent.y1>=256 || extent.y2<0)continue;
      // accumulate a chain of functions that will be called in sequence to paint onto the tile area
      promise = this.makePromise(scratch,extent,promise);
    }

    // do it
    promise();

  }


  /*
  getImageURL() {
    // build URL for image by hand
    //https://beta.cesium.com/api/assets/3470/18/59898/154203.png?access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2MTEyZDdmYi05OTQ0LTQ3ZDAtYTAyNS1lNmFjOWMzN2JkYzUiLCJpZCI6NjksImlhdCI6MTQ4Nzc5MjM5MH0.tbT0fXHXtmMtyFPRguvjlNPupSukLUNab5pCIZgZWmw
    let token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2MTEyZDdmYi05OTQ0LTQ3ZDAtYTAyNS1lNmFjOWMzN2JkYzUiLCJpZCI6NjksImlhdCI6MTQ4Nzc5MjM5MH0.tbT0fXHXtmMtyFPRguvjlNPupSukLUNab5pCIZgZWmw";
    let imageurl = "https://beta.cesium.com/api/assets/3470/"+tile.lod+"/"+tile.x+"/"+tile.y+".png?access_token="+token;
    //imageurl = "images/"+lod+"/"+tile.x+"/"+tile.y+".png";
    let image = new Image();
    image.onload = function(results) {
    };
    image.src = imageurl;
  }
  */

}


let imageServer = new ImageServer();


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// A tile provider abstraction
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

class TileServer  {
  // https://cesium.com/blog/2015/08/10/introducing-3d-tiles/
  // http://blog.mastermaps.com/2014/10/3d-terrains-with-cesium.html

  constructor() {
    if(!Cesium.terrainProvider) {
      Cesium.terrainProvider = new Cesium.CesiumTerrainProvider({
        requestVertexNormals : true, 
        url:"https://assets.agi.com/stk-terrain/v1/tilesets/world/tiles",
      });
    }    
  }

  ready(callback) {
    Cesium.when(Cesium.terrainProvider.readyPromise).then(callback);
  }

  ground(lat,lon,lod,callback) {
    let pointOfInterest = Cesium.Cartographic.fromDegrees(lon,lat);
    Cesium.sampleTerrain(Cesium.terrainProvider,lod,[pointOfInterest]).then(function(groundResults) {
      callback(groundResults[0].height);
    });
  }

  tile(x,y,lod,callback) {
    Cesium.when(Cesium.terrainProvider.requestTileGeometry(x,y,lod),function(tile){callback(tile)}).otherwise(function(error) {
      console.error(error);
    });
  }

  extent(lod) {
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

  xy2ll(x,y,lod) {
    let scheme = this.extent(lod);
    scheme.x = x;
    scheme.y = y;
    scheme.lon = 360 * x / scheme.w - 180;
    scheme.lat = 90 - 180 * y / scheme.h;
    return scheme;
  }

  ll2yx(lat,lon,lod) {
    let scheme = this.extent(lod);
    scheme.lon = lon;
    scheme.lat = lat;
    scheme.x = (180+lon) * scheme.w / 360;
    scheme.y = ( 90-lat) * scheme.h / 180;
    //let xy = Cesium.terrainProvider.tilingScheme.positionToTileXY(pointOfInterest,lod);
    //Cesium.terrainProvider.tilingScheme.getNumberOfXTilesAtLevel(lod) * (180+lon) / 360;
    //Cesium.terrainProvider.tilingScheme.getNumberOfYTilesAtLevel(lod) * ( 90-lat) / 180;
    return scheme;
  }
}

let tileServer = new TileServer();

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
    let scheme = tileServer.ll2yx(lat,lon,lod);
    let size = scheme.meters_wide;
    let x = scheme.x*size;
    let y = scheme.y*size;
    this.el.setAttribute('position',{x:x,y:-y,z:elevation});
  },
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// aframe spatial box
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

AFRAME.registerComponent('a-llbox', {
  schema: {
     east: {type: 'number', default: 0},
     west: {type: 'number', default: 0},
    north: {type: 'number', default: 0},
    south: {type: 'number', default: 0},
      lat: {type: 'number', default: 0},
      lon: {type: 'number', default: 0},
      lod: {type: 'number', default: 15},
     lat2: {type: 'number', default: 0},
     lon2: {type: 'number', default: 0},
    scale: {type: 'number', default: 1},
    elevation: {type: 'number', default: 100},
    color: {type: 'string', default: '#ff00ff' },
  },
  init: function() {

    let lat = this.data.north * 180 / Math.PI;
    let lon = this.data.west * 180 / Math.PI;
    let lod = this.data.lod;

    let elevation = this.data.elevation;
    let scale = this.data.scale;
    let scheme = tileServer.ll2yx(lat,lon,lod);
    let size = scheme.meters_wide;
    let x = scheme.x*size*scale;
    let y = scheme.y*size*scale;
    console.log("the dot is at x=" + x + " y=" + y + " lat="+lat + " lon="+lon);
    this.material = new THREE.MeshPhongMaterial( { color:this.data.color, wireframe:false });
    this.geometry = new THREE.SphereGeometry( 60, 32, 32 );
    this.mesh = new THREE.Mesh(this.geometry,this.material);
    this.el.setObject3D('mesh', this.mesh);
    this.el.setAttribute('position',{x:x,y:-y,z:elevation});

  },
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// GLTF load helper for buildings
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var GLTFLoader = new THREE.GLTFLoader();

AFRAME.registerComponent('a-building', {

  schema: {
    lat: {type: 'number', default: 0},
    lon: {type: 'number', default: 0},
    lod: {type: 'number', default: 0},
    x: {type: 'number', default: 0},
    y: {type: 'number', default: 0},
  },

  init: function () {

    let scope = this;
    let lon = this.data.lon; // this is used solely to derotate buildings
    let lat = this.data.lat;
    let lod = this.data.lod;

    let x = this.data.x;
    let y = 32767 - Math.floor(this.data.y);
    let url = "tiles3d/"+lod+"/"+x+"/"+y+".gltf";

    GLTFLoader.load(url,function ( gltf ) {
      // assets are pre-rotated for use with a globe! - but this isn't our use case - so reverse that out
      gltf.scene.rotateY(-lon*Math.PI/180);
      gltf.scene.rotateY(-Math.PI/2);
      gltf.scene.rotateX(lat*Math.PI/180);
      scope.el.setObject3D('mesh',gltf.scene);
    },
    function ( xhr ) {
    },
    function ( error ) {
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

AFRAME.registerComponent('a-tile', {
  schema: {
    lat: {type: 'number', default: 0},
    lon: {type: 'number', default: 0},
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
    tileServer.tile(x,y,lod,function(tile){scope.makeGeometry(tile)});
  },
  makeGeometry:function(tile) {
    let scope = this;
    let x = this.data.x;
    let y = this.data.y;
    let lon = this.data.lon; // this is used solely to derotate buildings
    let lat = this.data.lat;
    let lod = this.data.lod;
    let size = this.data.size;
    let scale = this.data.scale;
    this.geometry = new THREE.Geometry();
    // convert terrain to verts
    for (let i=0; i<tile._uValues.length; i++) {
      let vx = tile._uValues[i]*size/32767*scale;
      let vy = tile._vValues[i]*size/32767*scale;
      let vz = (((tile._heightValues[i]*(tile._maximumHeight-tile._minimumHeight))/32767.0)+tile._minimumHeight)*scale;
      var v = new THREE.Vector3(vx,vy,vz);
      this.geometry.vertices.push(v);
    }
    // make faces for mesh
    for (let i=0; i<tile._indices.length-1; i=i+3) {
      this.geometry.faces.push(new THREE.Face3(tile._indices[i], tile._indices[i+1], tile._indices[i+2]));
    }
    // tidy
    this.geometry.computeFaceNormals();

    // this.geometry = new THREE.SphereGeometry( size*scale/2, 32, 32 );

    // make uvs
    let threejs_recomputeuv = function(geometry,x,y,scale) {
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
    threejs_recomputeuv(this.geometry,0,0,size*scale);

    // attach image
    // TODO right now the image is fetched at the lat, lon - it should be fetched at the tile index
    imageServer.getImageMaterial(lat,lon,lod,function(material) {
      scope.mesh = new THREE.Mesh(scope.geometry,material);
      scope.el.setObject3D('mesh', scope.mesh);
      scope.el.setAttribute('position', { x:x*size*scale, y:-(y+1)*size*scale, z:0} );

/*
console.log("tile is at x=" + (x*size*scale) + " y=" + (y*size*scale));

// TEST

 // get tile coords as a test to compare tile and image
 //let scheme = tileServer.ll2yx(lat,lon,lod);
 //let xx = Math.floor(scheme.x);
 //let yy = Math.floor(scheme.y);
 //let scheme2 = tileServer.xy2ll(xx,yy,lod);
 //console.log(scheme);

 // back convert
 //let scheme3 = tileServer.xy2ll(xx+1,yy+1,lod);
 //console.log(scheme3.lon - scheme2.lon);
 //console.log(scheme3.lat - scheme2.lat);

 // get bounds of terrain tile
 let poi = Cesium.Cartographic.fromDegrees(lon,lat);
 let txy = Cesium.terrainProvider.tilingScheme.positionToTileXY(poi,lod);
 let tr = Cesium.terrainProvider.tilingScheme.tileXYToRectangle(txy.x,txy.y,lod);
 console.log("we think the terrain tile is at =============== lat="+lat + " lon="+lon);
 console.log(poi);
 console.log(txy);
 console.log(tr);

 // get bounds of image tile
 let ixy = Cesium.imageProvider.tilingScheme.positionToTileXY(poi,lod);
 let ir = Cesium.imageProvider.tilingScheme.tileXYToRectangle(ixy.x,ixy.y,lod);
 console.log(ir);
*/

/*
let mymaterial = new THREE.MeshPhongMaterial( { color:0xff0000, wireframe:false });
let myw = tr.east-tr.west;
let myh = tr.north-tr.south; myh = -myh;
console.log(myw);
let mymesh = new THREE.Mesh(new THREE.BoxGeometry( size * scale, size * scale, size ), mymaterial );
mymesh.position.set( size*scale/2, size*scale/2, 0 );
scope.mesh.add(mymesh);

myw = (ir.east-ir.west) / myw;
myh = -(ir.north-ir.south) / myh;
console.log(myw);
console.log(myh);
let mymaterial2 = new THREE.MeshPhongMaterial( { color:0xff00ff, wireframe:false });
let mymesh2 = new THREE.Mesh(new THREE.BoxGeometry(
    size * scale * myw * 10000,
    size * scale * myh * 10000,
    size
    ), mymaterial2 );
mymesh2.position.set(
  (tr.west-ir.west)*scale*size*10000,
  (tr.north-ir.north)*scale*size*10000,
  0);
//scope.mesh.add(mymesh2);

//console.log( Cesium.imageProvider.tilingScheme.getNumberOfXTilesAtLevel(lod) * (180+lon) / 360 );
//console.log( Cesium.imageProvider.tilingScheme.getNumberOfYTilesAtLevel(lod) * ( 90-lat) / 180 );
*/

/*
var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");
ctx.fillStyle = "#FF0000";
ctx.fillRect(300 + (tr.west) * 100,
             300 - (tr.north) * 100,
             300 + (tr.east-tr.west) * 100,
             300 + (tr.north-tr.south) * 100
            );

ctx.fillStyle = "#FF00FF";
ctx.fillRect(300 + (ir.west) * 100,
             300 - (ir.north) * 100,
             300 + (ir.east-ir.west) * 100,
             300 + (ir.north-ir.south) * 100
            );
*/


    });

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
         scale: {type: 'number', default:    1}, // scaling for landscape - 1 = 1 meter
        ground: {type: 'number', default:    0},     // where is the ground (recomputed periodically)
     elevation: {type: 'number', default:  1000},    // meters above the ground should the origin be (for camera)
      pollRate: {type: 'number', default:    0},     // query user geolocation via geolocation api
  },

  init: function() {
    let scope = this;
    // wait for cesium and then render current focus
    tileServer.ready( imageServer.ready ( function(){
      // add listeners to poll user location periodically at specified rate
      scope.getLocation();
      // temporary - add listeners for user input for now (this may be removed - it acts as a helper for debugging)
      scope.getUserInput();
      // Goto this position, updating tiles and generally showing a view here
      scope.updateAll();
    }));
  },

  updateTile: function(data,x,y) {
    // unfortunately approximate lat and lon are needed to derotate buildings
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
      let land = document.createElement('a-entity');
      land.setAttribute('id',key);
      land.setAttribute('a-tile', { x:x, y:y, lod:lod, size:size, scale:scale, lat:lat, lon:lon });
      //element.setAttribute('position', { x:x*size*scale, y:-(y+1)*size*scale, z:0} ); // <- done in child for now
      this.el.appendChild(land);
      // make building also (unfortunately it needs to know approximate latitude and longitude to unrotate frame of reference)
      let building = document.createElement('a-entity');
      building.setAttribute('id',key);
      building.setAttribute('a-building',{ lat:lat, lon:lon, lod:lod, x:x, y:y });
      building.setAttribute('position', { x:(x+0.5)*size*scale, y:-(y-0.5+1)*size*scale, z:0*scale} );
      building.setAttribute('scale', {x:scale, y:scale, z:scale });
      this.el.appendChild(building);
    }
  },

  updateTilesAll: function() {
    let data = this.data;
    let lat = data.lat;
    let lon = data.lon;
    let lod = data.lod;
    // get pov fractional tile coordinates directly - bypassing cesium because fractional coordinates are desired
    let scheme = tileServer.ll2yx(lat,lon,lod);
    let x = data.x = scheme.x;
    let y = data.y = scheme.y;
    let xy = data.xy = { x:Math.floor(x), y:Math.floor(y) };
    // re-get spatial coverage of a tile at this LOD in meters and remember it (TODO can do this by asking Cesium instead also?)
    let size = data.size = scheme.meters_wide;
    // TODO improve region to paint determination
    for(let i = -2; i<2;i++) {
      for(let j = -2; j<2;j++) {
        i = j = 0;
        this.updateTile(data,xy.x+i,xy.y+j);
        return;
      }
    }
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
      let scheme = tileServer.ll2yx(lat,lon,lod);
      let size = data.size = scheme.meters_wide;
      let x = scheme.x * size * scale;
      let y = -scheme.y * size * scale; // -size*scale;
      this.el.setAttribute('position', { x:-x, y:-y, z:-(ground+elevation)*scale });
    } catch(e) { console.error(e); };
  },

  updateAll: function() {
    let scope = this;
    let lat = this.data.lat;
    let lon = this.data.lon;
    let lod = this.data.lod;
    tileServer.ground(lat,lon,lod,function(ground) {
      // reset ground height for entire world (distance of pov from tile geometry)
      scope.data.ground = ground;
      // now paint all
      scope.updateTilesAll();
      // and move pov
      scope.updatePose();
    });
    // optional - force an extra (inaccurate) update immediately to reduce jerkyness of a wait for the terrain sampling to return above
    scope.updatePose();
  },

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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

- top down navigation support

  - introduce a concept of distance and directly calculate the lod from that distance
  - let player change distance
  - let player pan

- images

    - get the exact longitude latitude extents of my tile
    - ask cesium for all those tiles
    - ideally getting 4 - at the closest larger extent
    - paint those 4 - can use a shader if i wish



*/


