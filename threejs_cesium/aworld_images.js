//////////////////////////////////////////////////////////////////////////////////////////////////////////
// image loader
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
  ctx.fillText("hello",100,100);

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

  // - figure out where this tile is
  // - figure out where it goes on canvas


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
  if(USE_IMAGE_SCHEME) {
    // cesium has an abstraction for position that includes elevation - ask it given tile scheme to return tile offsets
    position = Cesium.Cartographic.fromDegrees(lon,lat);
    xy = provider.tilingScheme.positionToTileXY(position, lod);
  } else {
    // because the end point cannot respond quickly enough I've bypassed it and memoized it for my testing
    position = { height: 0, latitude: 0.5282153512387369, longitude: -1.7059525890154297 };
    xy = { x: 59888, y: 154206 };
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

    if(USE_IMAGE_SCHEME) {
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
