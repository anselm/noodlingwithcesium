// Prepare cesium to load a single tile
// This is a copy of cesium internal code in cesiumterrainprovider

var createQuantizedMeshTerrainData = function(buffer, level, x, y, tmsY) {

  var pos = 0;
  var cartesian3Elements = 3;
  var boundingSphereElements = cartesian3Elements + 1;
  var cartesian3Length = Float64Array.BYTES_PER_ELEMENT * cartesian3Elements;
  var boundingSphereLength = Float64Array.BYTES_PER_ELEMENT * boundingSphereElements;
  var encodedVertexElements = 3;
  var encodedVertexLength = Uint16Array.BYTES_PER_ELEMENT * encodedVertexElements;
  var triangleElements = 3;
  var bytesPerIndex = Uint16Array.BYTES_PER_ELEMENT;
  var triangleLength = bytesPerIndex * triangleElements;

  var view = new DataView(buffer);
  var center = new Cesium.Cartesian3(view.getFloat64(pos, true), view.getFloat64(pos + 8, true), view.getFloat64(pos + 16, true));
  pos += cartesian3Length;

  var minimumHeight = view.getFloat32(pos, true);
  pos += Float32Array.BYTES_PER_ELEMENT;
  var maximumHeight = view.getFloat32(pos, true);
  pos += Float32Array.BYTES_PER_ELEMENT;

  var boundingSphere = new Cesium.BoundingSphere(
    new Cesium.Cartesian3(view.getFloat64(pos, true), view.getFloat64(pos + 8, true), view.getFloat64(pos + 16, true)),
    view.getFloat64(pos + cartesian3Length, true));
  pos += boundingSphereLength;

  var horizonOcclusionPoint = new Cesium.Cartesian3(view.getFloat64(pos, true), view.getFloat64(pos + 8, true), view.getFloat64(pos + 16, true));
  pos += cartesian3Length;

  var vertexCount = view.getUint32(pos, true);
  pos += Uint32Array.BYTES_PER_ELEMENT;
  var encodedVertexBuffer = new Uint16Array(buffer, pos, vertexCount * 3);
  pos += vertexCount * encodedVertexLength;

  if (vertexCount > 64 * 1024) {
    // More than 64k vertices, so indices are 32-bit.
    bytesPerIndex = Uint32Array.BYTES_PER_ELEMENT;
    triangleLength = bytesPerIndex * triangleElements;
  }

  // Decode the vertex buffer.
  var uBuffer = encodedVertexBuffer.subarray(0, vertexCount);
  var vBuffer = encodedVertexBuffer.subarray(vertexCount, 2 * vertexCount);
  var heightBuffer = encodedVertexBuffer.subarray(vertexCount * 2, 3 * vertexCount);

  var i;
  var u = 0;
  var v = 0;
  var height = 0;

  function zigZagDecode(value) {
    return (value >> 1) ^ (-(value & 1));
  }

  for (i = 0; i < vertexCount; ++i) {
    u += zigZagDecode(uBuffer[i]);
    v += zigZagDecode(vBuffer[i]);
    height += zigZagDecode(heightBuffer[i]);

    uBuffer[i] = u;
    vBuffer[i] = v;
    heightBuffer[i] = height;
  }

  // skip over any additional padding that was added for 2/4 byte alignment
  if (pos % bytesPerIndex !== 0) {
    pos += (bytesPerIndex - (pos % bytesPerIndex));
  }

  var triangleCount = view.getUint32(pos, true);
  pos += Uint32Array.BYTES_PER_ELEMENT;
  var indices = Cesium.IndexDatatype.createTypedArrayFromArrayBuffer(vertexCount, buffer, pos, triangleCount * triangleElements);
  pos += triangleCount * triangleLength;

  // High water mark decoding based on decompressIndices_ in webgl-loader's loader.js.
  // https://code.google.com/p/webgl-loader/source/browse/trunk/samples/loader.js?r=99#55
  // Copyright 2012 Google Inc., Apache 2.0 license.
  var highest = 0;
  for (i = 0; i < indices.length; ++i) {
    var code = indices[i];
    indices[i] = highest - code;
    if (code === 0) {
      ++highest;
    }
  }

  var westVertexCount = view.getUint32(pos, true);
  pos += Uint32Array.BYTES_PER_ELEMENT;
  var westIndices = Cesium.IndexDatatype.createTypedArrayFromArrayBuffer(vertexCount, buffer, pos, westVertexCount);
  pos += westVertexCount * bytesPerIndex;

  var southVertexCount = view.getUint32(pos, true);
  pos += Uint32Array.BYTES_PER_ELEMENT;
  var southIndices = Cesium.IndexDatatype.createTypedArrayFromArrayBuffer(vertexCount, buffer, pos, southVertexCount);
  pos += southVertexCount * bytesPerIndex;

  var eastVertexCount = view.getUint32(pos, true);
  pos += Uint32Array.BYTES_PER_ELEMENT;
  var eastIndices = Cesium.IndexDatatype.createTypedArrayFromArrayBuffer(vertexCount, buffer, pos, eastVertexCount);
  pos += eastVertexCount * bytesPerIndex;

  var northVertexCount = view.getUint32(pos, true);
  pos += Uint32Array.BYTES_PER_ELEMENT;
  var northIndices = Cesium.IndexDatatype.createTypedArrayFromArrayBuffer(vertexCount, buffer, pos, northVertexCount);
  pos += northVertexCount * bytesPerIndex;

  var encodedNormalBuffer;
  var waterMaskBuffer;
  while (pos < view.byteLength) {
    var extensionId = view.getUint8(pos, true);
    console.log(extensionId);
    pos += Uint8Array.BYTES_PER_ELEMENT;
    //var extensionLength = view.getUint32(pos, provider._littleEndianExtensionSize);
    var extensionLength = view.getUint32(pos);
    pos += Uint32Array.BYTES_PER_ELEMENT;
    var OCT_VERTEX_NORMALS = 1;
    var WATER_MASK = 2;
    if (extensionId === OCT_VERTEX_NORMALS) {
      encodedNormalBuffer = new Uint8Array(buffer, pos, vertexCount * 2);
    } else if (extensionId === WATER_MASK) {
      waterMaskBuffer = new Uint8Array(buffer, pos, extensionLength);
    }
    pos += extensionLength;
  }

  //var skirtHeight = provider.getLevelMaximumGeometricError(level) * 5.0;
  //var skirtHeight = provider.getLevelMaximumGeometricError(level) * 5.0;
/*
  var rectangle = provider._tilingScheme.tileXYToRectangle(x, y, level);
  var orientedBoundingBox;
  if (rectangle.width < CesiumMath.PI_OVER_TWO + CesiumMath.EPSILON5) {
    // Here, rectangle.width < pi/2, and rectangle.height < pi
    // (though it would still work with rectangle.width up to pi)

    // The skirt is not included in the OBB computation. If this ever
    // causes any rendering artifacts (cracks), they are expected to be
    // minor and in the corners of the screen. It's possible that this
    // might need to be changed - just change to `minimumHeight - skirtHeight`
    // A similar change might also be needed in `upsampleQuantizedTerrainMesh.js`.
    orientedBoundingBox = OrientedBoundingBox.fromRectangle(rectangle, minimumHeight, maximumHeight, provider._tilingScheme.ellipsoid);
  }
 */

  let results = {
    indices: indices,
    xVertices: uBuffer,
    yVertices: vBuffer,
    hVertices: heightBuffer,
    encodedNormalBuffer: encodedNormalBuffer,
    waterMaskBuffer: waterMaskBuffer
  }

  return results;
}

