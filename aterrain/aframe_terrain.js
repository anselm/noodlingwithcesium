
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// An image source manager - returns a 3js material representing a given tile's coverage
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

class ImageServer {
  constructor(terrainProvider, imageProvider) {
    this.terrainProvider = terrainProvider;
    this.imageProvider = imageProvider;
    this.width = 256; // this is hardcoded to the size of the bing tiles... could be set when first tile retrieved or from provider TODO
  }
  ready(callback) {
    Cesium.when(this.imageProvider.readyPromise).then(callback);
  }
  //metersWide(lod) {
  //  // https://msdn.microsoft.com/en-us/library/bb259689.aspx
  //  let EarthRadius = 6378137;
  //  let EarthCircumference = 40054700.36; // 2*Math.PI*EarthRadius;
  //  let tilesWide = 2 << lod;
  //  return EarthCircumference/tilesWide;
  //}
  //groundResolution(latitude, levelOfDetail) {
  //  let EarthRadius = 6378137;
  //  let EarthCircumference = 40054700.36; // 2*Math.PI*EarthRadius;
  //  let mapSize = 256 << levelOfDetail;
  //  return Math.cos(latitude * Math.PI / 180) * EarthCircumference / mapSize;
  // }
  scratchpad() {
    // let canvas = document.getElementById("tutorial");
    let size = this.width;
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
    let txy = this.terrainProvider.tilingScheme.positionToTileXY(poi,lod);
    let trect = this.terrainProvider.tilingScheme.tileXYToRectangle(txy.x,txy.y,lod);

    // set the extent of an image tile overlapping this coordinate
    let ixy = this.imageProvider.tilingScheme.positionToTileXY(poi,lod);
    ixy.y += offset;
    let irect = this.imageProvider.tilingScheme.tileXYToRectangle(ixy.x,ixy.y,lod);

    // the width and height of the pixel buffer is as so
    let pixels = 256;

    // basically ( image northern latitude relative to terrain tile northern latitude ) * pixel height / ( terrain tile latitude extent )
    let x1 = 0;
    let x2 = pixels;
    let y1 = (trect.north - irect.north) * pixels / (trect.north-trect.south);
    let y2 = (trect.north - irect.south) * pixels / (trect.north-trect.south);

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
    let scope = this;
    let promise = function() {
      let request = scope.imageProvider.requestImage(extent.ixy.x,extent.ixy.y,extent.lod);
      Cesium.when(request,function(image) {
        scratch.paint(image,extent);
        if(resolve)resolve();
      });
    };
    return promise;
  }

  toMaterial(lat,lon,lod,callback) {

    // get a canvas (a basic canvas and a couple of helper methods I tacked onto it)
    let scratch = this.scratchpad();

    // this will be called last in the chain built below - it will return a nice material to the caller
    let chain = function() {
      callback(scratch.material());
    };

    for(let i = -2; i < 3; i++) {
      // consider image extents that may overlap the tile extent that needs to be fully painted
      let extent = this.getExtent(lat,lon,lod,i);
      if(extent.y1>=256 || extent.y2<0)continue;
      // accumulate a chain of functions that will be called in sequence to paint onto the tile area
      chain = this.makePromise(scratch,extent,chain);
    }

    // do it
    chain();

  }

  //getImageURL() {
  //  // build URL for image by hand
  //  //https://beta.cesium.com/api/assets/3470/18/59898/154203.png?access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2MTEyZDdmYi05OTQ0LTQ3ZDAtYTAyNS1lNmFjOWMzN2JkYzUiLCJpZCI6NjksImlhdCI6MTQ4Nzc5MjM5MH0.tbT0fXHXtmMtyFPRguvjlNPupSukLUNab5pCIZgZWmw
  //  let token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2MTEyZDdmYi05OTQ0LTQ3ZDAtYTAyNS1lNmFjOWMzN2JkYzUiLCJpZCI6NjksImlhdCI6MTQ4Nzc5MjM5MH0.tbT0fXHXtmMtyFPRguvjlNPupSukLUNab5pCIZgZWmw";
  //  let imageurl = "https://beta.cesium.com/api/assets/3470/"+tile.lod+"/"+tile.x+"/"+tile.y+".png?access_token="+token;
  //  //imageurl = "images/"+lod+"/"+tile.x+"/"+tile.y+".png";
  //  let image = new Image();
  //  image.onload = function(results) {
  //  };
  //  image.src = imageurl;
  //}

}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// A tile provider abstraction
//
// Each tile is:
//  - in meters
//  - not centered, their internal extent starts at 0,0,0 and end at size,size,size
//  - placed absolutely in space in meters on a huge sheet extending world width and height
//  - arranged on the x/y plane
//  - not stretched vertically (one meter == 1 unit)
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

class TileServer  {
 
  constructor(terrainProvider,imageProvider) {
    this.terrainProvider = terrainProvider;
    //this.imageProvider = imageProvider;
    this.imageServer = new ImageServer(terrainProvider, imageProvider);
  }

  ready(callback) {
    let scope = this;
    Cesium.when(scope.terrainProvider.readyPromise).then( function() {
      scope.imageServer.ready(callback);
    });
  }

  ground(data,callback) {
    let scope = this;
    let lat = data.lat;
    let lon = data.lon;
    let lod = data.lod;
    let poi = Cesium.Cartographic.fromDegrees(lon,lat);
    Cesium.sampleTerrain(scope.terrainProvider,lod,[poi]).then(function(groundResults) {
      callback(groundResults[0].height);
    });
  }

  tile(data,callback) {
    let scope = this;
    let lat = data.lat;
    let lon = data.lon;
    let lod = data.lod;
    let scale = data.scale;
    // Get tile index and size
    let scheme = scope.ll2yx(data);
    let size = scheme.meters_wide;
    let xtile = scheme.xtile;
    let ytile = scheme.ytile;
    // Ask for an tile given an integer tile index and lod
    Cesium.when(scope.terrainProvider.requestTileGeometry(xtile,ytile,lod),function(tile) {
      // get geometry
      let geometry = scope.toGeometry(size,scale,tile);
      // get image to drape on top
      scope.imageServer.toMaterial(lat,lon,lod,function(material) {
        // Make a 3js mesh from that with the material
        let mesh = new THREE.Mesh(geometry,material);
        // Place it absolutely at tile index - arguably the caller should do this but the value is handy here.
        mesh.position.set(xtile*size*scale,-(ytile+1)*size*scale,0);
        // Pass it back to the caller
        callback(mesh);
      });
    }).otherwise(function(error) {
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

  //xy2ll(x,y,lod) {
  //  let scheme = this.extent(lod);
  //  scheme.x = x;
  //  scheme.y = y;
  //  scheme.lon = 360 * x / scheme.w - 180;
  //  scheme.lat = 90 - 180 * y / scheme.h;
  //  return scheme;
  //}

  ll2yx(data) {
    // Directly compute fractional tile coordinates - bypassing Cesium because it has a startup delay and because fractional coordinates are desired
    // TODO This could be a static prototype
    let scheme = this.extent(data.lod);
    scheme.lon = data.lon;
    scheme.lat = data.lat;
    scheme.x = (180+data.lon) * scheme.w / 360;
    scheme.y = ( 90-data.lat) * scheme.h / 180;
    scheme.xtile = Math.floor(scheme.x);
    scheme.ytile = Math.floor(scheme.y);
    scheme.uuid = "tile-"+scheme.xtile+"-"+scheme.ytile+"-"+scheme.lod;
    //let xy = this.terrainProvider.tilingScheme.positionToTileXY(pointOfInterest,lod);
    //this.terrainProvider.tilingScheme.getNumberOfXTilesAtLevel(lod) * (180+lon) / 360;
    //this.terrainProvider.tilingScheme.getNumberOfYTilesAtLevel(lod) * ( 90-lat) / 180;
    return scheme;
  }

  toGeometry(size,scale,tile) {
    let geometry = new THREE.Geometry();
    // convert terrain to verts
    for (let i=0; i<tile._uValues.length; i++) {
      let vx = tile._uValues[i]*size/32767*scale;
      let vy = tile._vValues[i]*size/32767*scale;
      let vz = (((tile._heightValues[i]*(tile._maximumHeight-tile._minimumHeight))/32767.0)+tile._minimumHeight)*scale;
      var v = new THREE.Vector3(vx,vy,vz);
      geometry.vertices.push(v);
    }
    // make faces for mesh
    for (let i=0; i<tile._indices.length-1; i=i+3) {
      geometry.faces.push(new THREE.Face3(tile._indices[i], tile._indices[i+1], tile._indices[i+2]));
    }
    // face normals
    geometry.computeFaceNormals();

    // uvs
    let faces = geometry.faces;
    geometry.faceVertexUvs[0] = [];
    for (let i = 0; i < faces.length ; i++) {
      let v1 = geometry.vertices[faces[i].a]; 
      let v2 = geometry.vertices[faces[i].b]; 
      let v3 = geometry.vertices[faces[i].c];
      geometry.faceVertexUvs[0].push([
        new THREE.Vector2(v1.x/size/scale, v1.y/size/scale ),
        new THREE.Vector2(v2.x/size/scale, v2.y/size/scale ),
        new THREE.Vector2(v3.x/size/scale, v3.y/size/scale )
      ]);
    }
    geometry.uvsNeedUpdate = true;
    return geometry;
  }

}

Cesium.imageProvider = new Cesium.BingMapsImageryProvider({
  url : 'https://dev.virtualearth.net',
  key : 'RsYNpiMKfN7KuwZrt8ur~ylV3-qaXdDWiVc2F5NCoFA~AkXwps2-UcRkk2L60K5qBy5kPnTmwvxdfwl532NTheLdFfvYlVJbLnNWG1iC-RGL',
  mapStyle : Cesium.BingMapsStyle.AERIAL
});

Cesium.terrainProvider = new Cesium.CesiumTerrainProvider({
  requestVertexNormals : true, 
  url:"https://assets.agi.com/stk-terrain/v1/tilesets/world/tiles",
});

// TODO this should not be global
let tileServer = new TileServer(Cesium.terrainProvider, Cesium.imageProvider);

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
    let scheme = tileServer.ll2yx(data);
    let size = scheme.meters_wide;
    let x = scheme.x*size;
    let y = scheme.y*size;
    this.el.setAttribute('position',{x:x,y:-y,z:elevation});
  },
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// GLTF load helper for buildings
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var GLTFLoader = new THREE.GLTFLoader();

AFRAME.registerComponent('a-building', {
  // TODO remove this completely and just use an a-gltf ...

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
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

AFRAME.registerComponent('a-tile', {
  schema: {
    lat: {type: 'number', default: 0},
    lon: {type: 'number', default: 0},
    lod: {type: 'number', default: 0},
  scale: {type: 'number', default: 1},
  },
  init: function () {
    let scope = this;
    tileServer.tile(scope.data,function(mesh) {
      scope.el.setObject3D('mesh',mesh);
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
          size: {type: 'number', default:    0},     // where is the ground (recomputed) TODO remove from schema
         scale: {type: 'number', default:    1},     // scaling for landscape - 1 = 1 meter
        ground: {type: 'number', default:    0},     // where is the ground (recomputed) TODO remove from schema
     elevation: {type: 'number', default: 1000},     // meters above the ground should the origin be (for camera)
      pollRate: {type: 'number', default:    0},     // query user geolocation via geolocation api - TODO remove this feature
  },

  init: function() {
    let scope = this;
    // TODO would nice not global namespace
    // wait for server and then render current focus
    tileServer.ready( function(){
      // add listeners to poll user location periodically at specified rate
      scope.getLocation();
      // temporary - add listeners for user input for now (this may be removed - it acts as a helper for debugging)
      scope.getUserInput();
      // Goto this position, updating tiles and generally showing a view here
      scope.updateAll();
    });
  },

  updateAll: function() {
    // begin fetching tiles
    this.updateTiles();
    // begin updating pose
    this.updatePose();
  },

  updateTiles: function() {
    this.updateTile(this.data);
  },

  updateTile: function(data) {

    // find or make tile that overlaps supplied longitude, latitude and lod
    let scheme = tileServer.ll2yx(data);
    let uuid = scheme.uuid;
    let tile = this.el.querySelector("#"+uuid);
    if(tile) {
      return;
    }
    let element = document.createElement('a-entity');
    element.setAttribute('id',uuid);
    element.setAttribute('a-tile',{lat:data.lat,lon:data.lon,lod:data.lod,scale:data.scale});
    this.el.appendChild(element);

    // make building also (unfortunately it needs to know approximate latitude and longitude to unrotate frame of reference)
    let lat = data.lat;
    let lon = data.lon;
    let lod = data.lod;
    let scale = data.scale;
    let ground = data.ground;
    let size = scheme.meters_wide;
    let x = scheme.xtile;
    let y = scheme.ytile;
    let building = document.createElement('a-entity');
    building.setAttribute('a-building',{ lat:lat, lon:lon, lod:lod, x:x, y:y });
    building.setAttribute('position', { x:(x+0.5)*size*scale, y:-(y-0.5+1)*size*scale, z:0*scale} );
    building.setAttribute('scale', {x:scale, y:scale, z:scale });
    this.el.appendChild(building);
  },

  updatePose: function() {
    let scope = this;
    let data = scope.data;
    let scale = data.scale;
    let elevation = data.elevation;
    let scheme = tileServer.ll2yx(data);
    let ground = data.ground;
    let size = data.size = scheme.meters_wide;
    let x = scheme.x * size * scale;
    let y = -scheme.y * size * scale;

    // set a-terrain such that 0,0,0 is current lon,lat,lod considering elevation and _stale_ ground estimation
    if(scope.data.groundLatched) {
      scope.el.setAttribute('position', { x:-x, y:-y, z:-(ground+elevation)*scale });
    }

    // get ground height
    tileServer.ground(scope.data,function(groundValue) {
      // reset ground height for entire world (distance of pov from tile geometry)
      scope.data.ground = ground = groundValue;
      scope.data.groundLatched = true;
      // set a-terrain such that 0,0,0 is current lon,lat,lod considering elevation and _fresh_ ground estimation
      scope.el.setAttribute('position', { x:-x, y:-y, z:-(ground+elevation)*scale });
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

// TODO
//
//  - zoom controls and navigation
//  - handle wrap around lat/lon
//  - also render a globe as well? could be handy
//
// tidy up
//  - see if we can remove tileServer as a global
//  - see if we can remove a-building as a concept




