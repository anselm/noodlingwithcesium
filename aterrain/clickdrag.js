'use strict';

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var keys = createCommonjsModule(function (module, exports) {
exports = module.exports = typeof Object.keys === 'function'
  ? Object.keys : shim;

exports.shim = shim;
function shim (obj) {
  var keys = [];
  for (var key in obj) keys.push(key);
  return keys;
}
});

var is_arguments = createCommonjsModule(function (module, exports) {
var supportsArgumentsClass = (function(){
  return Object.prototype.toString.call(arguments)
})() == '[object Arguments]';

exports = module.exports = supportsArgumentsClass ? supported : unsupported;

exports.supported = supported;
function supported(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

exports.unsupported = unsupported;
function unsupported(object){
  return object &&
    typeof object == 'object' &&
    typeof object.length == 'number' &&
    Object.prototype.hasOwnProperty.call(object, 'callee') &&
    !Object.prototype.propertyIsEnumerable.call(object, 'callee') ||
    false;
}
});

var index = createCommonjsModule(function (module) {
var pSlice = Array.prototype.slice;
var objectKeys = keys;
var isArguments = is_arguments;

var deepEqual = module.exports = function (actual, expected, opts) {
  if (!opts) opts = {};
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (actual instanceof Date && expected instanceof Date) {
    return actual.getTime() === expected.getTime();

  // 7.3. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!actual || !expected || typeof actual != 'object' && typeof expected != 'object') {
    return opts.strict ? actual === expected : actual == expected;

  // 7.4. For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected, opts);
  }
};

function isUndefinedOrNull(value) {
  return value === null || value === undefined;
}

function isBuffer (x) {
  if (!x || typeof x !== 'object' || typeof x.length !== 'number') return false;
  if (typeof x.copy !== 'function' || typeof x.slice !== 'function') {
    return false;
  }
  if (x.length > 0 && typeof x[0] !== 'number') return false;
  return true;
}

function objEquiv(a, b, opts) {
  var i, key;
  if (isUndefinedOrNull(a) || isUndefinedOrNull(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return deepEqual(a, b, opts);
  }
  if (isBuffer(a)) {
    if (!isBuffer(b)) {
      return false;
    }
    if (a.length !== b.length) return false;
    for (i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
  try {
    var ka = objectKeys(a),
        kb = objectKeys(b);
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!deepEqual(a[key], b[key], opts)) return false;
  }
  return typeof a === typeof b;
}
});

const COMPONENT_NAME = 'click-drag';
const DRAG_START_EVENT = 'dragstart';
const DRAG_MOVE_EVENT = 'dragmove';
const DRAG_END_EVENT = 'dragend';

const TIME_TO_KEEP_LOG = 100;

function forceWorldUpdate(threeElement) {

  let element = threeElement;
  while (element.parent) {
    element = element.parent;
  }

  element.updateMatrixWorld(true);
}

function forEachParent(element, lambda) {
  while (element.attachedToParent) {
    element = element.parentElement;
    lambda(element);
  }
}

function someParent(element, lambda) {
  while (element.attachedToParent) {
    element = element.parentElement;
    if (lambda(element)) {
      return true;
    }
  }
  return false;
}

function cameraPositionToVec3(camera, vec3) {

  vec3.set(
    camera.components.position.data.x,
    camera.components.position.data.y,
    camera.components.position.data.z
  );

  forEachParent(camera, element => {

    if (element.components && element.components.position) {
      vec3.set(
        vec3.x + element.components.position.data.x,
        vec3.y + element.components.position.data.y,
        vec3.z + element.components.position.data.z
      );
    }

  });

}

function localToWorld(THREE, threeCamera, vector) {
  forceWorldUpdate(threeCamera);
  return threeCamera.localToWorld(vector);
}

const {unproject} = (function unprojectFunction() {

  let initialized = false;

  let matrix;

  function initialize(THREE) {
    matrix = new THREE.Matrix4();

    return true;
  }

  return {

    unproject(THREE, vector, camera) {

      const threeCamera = camera.components.camera.camera;

      initialized = initialized || initialize(THREE);

      vector.applyProjection(matrix.getInverse(threeCamera.projectionMatrix));

      return localToWorld(THREE, threeCamera, vector);

    },
  };
}());

function clientCoordsTo3DCanvasCoords(
  clientX,
  clientY,
  offsetX,
  offsetY,
  clientWidth,
  clientHeight
) {
  return {
    x: (((clientX - offsetX) / clientWidth) * 2) - 1,
    y: (-((clientY - offsetY) / clientHeight) * 2) + 1,
  };
}

const {screenCoordsToDirection} = (function screenCoordsToDirectionFunction() {

  let initialized = false;

  let mousePosAsVec3;
  let cameraPosAsVec3;

  function initialize(THREE) {
    mousePosAsVec3 = new THREE.Vector3();
    cameraPosAsVec3 = new THREE.Vector3();

    return true;
  }

  return {
    screenCoordsToDirection(
      THREE,
      aframeCamera,
      {x: clientX, y: clientY}
    ) {

      initialized = initialized || initialize(THREE);

      // scale mouse coordinates down to -1 <-> +1
      const {x: mouseX, y: mouseY} = clientCoordsTo3DCanvasCoords(
        clientX, clientY,
        0, 0, // TODO: Replace with canvas position
        window.innerWidth,
        window.innerHeight
      );

      mousePosAsVec3.set(mouseX, mouseY, -1);

      // apply camera transformation from near-plane of mouse x/y into 3d space
      // NOTE: This should be replaced with THREE code directly once the aframe bug
      // is fixed:
/*
      cameraPositionToVec3(aframeCamera, cameraPosAsVec3);
      const {x, y, z} = new THREE
       .Vector3(mouseX, mouseY, -1)
       .unproject(aframeCamera.components.camera.camera)
       .sub(cameraPosAsVec3)
       .normalize();
*/
      const projectedVector = unproject(THREE, mousePosAsVec3, aframeCamera);

      cameraPositionToVec3(aframeCamera, cameraPosAsVec3);

      // Get the unit length direction vector from the camera's position
      const {x, y, z} = projectedVector.sub(cameraPosAsVec3).normalize();
      return {x, y, z};
    },
  };
}());

/**
 * @param planeNormal {THREE.Vector3}
 * @param planeConstant {Float} Distance from origin of the plane
 * @param rayDirection {THREE.Vector3} Direction of ray from the origin
 *
 * @return {THREE.Vector3} The intersection point of the ray and plane
 */
function rayPlaneIntersection(planeNormal, planeConstant, rayDirection) {
  // A line from the camera position toward (and through) the plane
  const distanceToPlane = planeConstant / planeNormal.dot(rayDirection);
  return rayDirection.multiplyScalar(distanceToPlane);
}

const {directionToWorldCoords} = (function directionToWorldCoordsFunction() {

  let initialized = false;

  let direction;
  let cameraPosAsVec3;

  function initialize(THREE) {
    direction = new THREE.Vector3();
    cameraPosAsVec3 = new THREE.Vector3();

    return true;
  }

  return {
    /**
     * @param camera Three.js Camera instance
     * @param Object Position of the camera
     * @param Object position of the mouse (scaled to be between -1 to 1)
     * @param depth Depth into the screen to calculate world coordinates for
     */
    directionToWorldCoords(
      THREE,
      aframeCamera,
      camera,
      {x: directionX, y: directionY, z: directionZ},
      depth
    ) {

      initialized = initialized || initialize(THREE);

      cameraPositionToVec3(aframeCamera, cameraPosAsVec3);
      direction.set(directionX, directionY, directionZ);

      // A line from the camera position toward (and through) the plane
      const newPosition = rayPlaneIntersection(
        camera.getWorldDirection(),
        depth,
        direction
      );

      // Reposition back to the camera position
      const {x, y, z} = newPosition.add(cameraPosAsVec3);

      return {x, y, z};

    },
  };
}());

const {selectItem} = (function selectItemFunction() {

  let initialized = false;

  let cameraPosAsVec3;
  let directionAsVec3;
  let raycaster;
  let plane;

  function initialize(THREE) {
    plane = new THREE.Plane();
    cameraPosAsVec3 = new THREE.Vector3();
    directionAsVec3 = new THREE.Vector3();
    raycaster = new THREE.Raycaster();

    // TODO: From camera values?
    raycaster.far = Infinity;
    raycaster.near = 0;

    return true;
  }

  return {
    selectItem(THREE, selector, camera, clientX, clientY) {

      initialized = initialized || initialize(THREE);

      const {x: directionX, y: directionY, z: directionZ} = screenCoordsToDirection(
        THREE,
        camera,
        {x: clientX, y: clientY}
      );

      cameraPositionToVec3(camera, cameraPosAsVec3);
      directionAsVec3.set(directionX, directionY, directionZ);

      raycaster.set(cameraPosAsVec3, directionAsVec3);

      // Push meshes onto list of objects to intersect.
      // TODO: Can we do this at some other point instead of every time a ray is
      // cast? Is that a micro optimization?
      const objects = Array.from(
        camera.sceneEl.querySelectorAll(`[${selector}]`)
      ).map(object => object.object3D);

      const recursive = true;

      const intersected = raycaster
        .intersectObjects(objects, recursive)
        // Only keep intersections against objects that have a reference to an entity.
        .filter(intersection => !!intersection.object.el)
        // Only keep ones that are visible
        .filter(intersection => intersection.object.parent.visible)
        // The first element is the closest
        [0]; // eslint-disable-line no-unexpected-multiline

      if (!intersected) {
        return {};
      }

      const {point, object} = intersected;

      // Aligned to the world direction of the camera
      // At the specified intersection point
      plane.setFromNormalAndCoplanarPoint(
        camera.components.camera.camera.getWorldDirection().clone().negate(),
        point.clone().sub(cameraPosAsVec3)
      );

      const depth = plane.constant;

      const offset = point.sub(object.getWorldPosition());

      return {depth, offset, element: object.el};

    },
  };
}());

function dragItem(THREE, element, offset, camera, depth, mouseInfo) {

  const threeCamera = camera.components.camera.camera;

  // Setting up for rotation calculations
  const startCameraRotationInverse = threeCamera.getWorldQuaternion().inverse();
  const startElementRotation = element.object3D.getWorldQuaternion();
  const elementRotationOrder = element.object3D.rotation.order;

  const rotationQuaternion = new THREE.Quaternion();
  const rotationEuler = element.object3D.rotation.clone();

  const offsetVector = new THREE.Vector3(offset.x, offset.y, offset.z);
  let lastMouseInfo = mouseInfo;

  const nextRotation = {
    x: THREE.Math.radToDeg(rotationEuler.x),
    y: THREE.Math.radToDeg(rotationEuler.y),
    z: THREE.Math.radToDeg(rotationEuler.z),
  };

  const activeCamera = element.sceneEl.systems.camera.activeCameraEl;

  const isChildOfActiveCamera = someParent(element, parent => parent === activeCamera);

  function onMouseMove({clientX, clientY}) {

    lastMouseInfo = {clientX, clientY};

    const direction = screenCoordsToDirection(
      THREE,
      camera,
      {x: clientX, y: clientY}
    );

    const {x, y, z} = directionToWorldCoords(
      THREE,
      camera,
      camera.components.camera.camera,
      direction,
      depth
    );


    let rotationDiff;

    // Start by rotating backwards from the initial camera rotation
    rotationDiff = rotationQuaternion.copy(startCameraRotationInverse);

    // rotate the offset
    offsetVector.set(offset.x, offset.y, offset.z);

    // Then add the current camera rotation
    rotationDiff = rotationQuaternion.multiply(threeCamera.getWorldQuaternion());

    offsetVector.applyQuaternion(rotationDiff);

    if (!isChildOfActiveCamera) {
      // And correctly offset rotation
      rotationDiff.multiply(startElementRotation);

      rotationEuler.setFromQuaternion(rotationDiff, elementRotationOrder);
    }

    nextRotation.x = THREE.Math.radToDeg(rotationEuler.x);
    nextRotation.y = THREE.Math.radToDeg(rotationEuler.y);
    nextRotation.z = THREE.Math.radToDeg(rotationEuler.z);

    const nextPosition = {x: x - offsetVector.x, y: y - offsetVector.y, z: z - offsetVector.z};

    // When the element has parents, we need to convert its new world position
    // into new local position of its parent element
    if (element.parentEl !== element.sceneEl) {

      // The new world position
      offsetVector.set(nextPosition.x, nextPosition.y, nextPosition.z);

      // Converted
      element.parentEl.object3D.worldToLocal(offsetVector);

      nextPosition.x = offsetVector.x;
      nextPosition.y = offsetVector.y;
      nextPosition.z = offsetVector.z;
    }

    element.emit(DRAG_MOVE_EVENT, {nextPosition, nextRotation, clientX, clientY});

    element.setAttribute('position', nextPosition);

    element.setAttribute('rotation', nextRotation);
  }

  function onTouchMove({changedTouches: [touchInfo]}) {
    onMouseMove(touchInfo);
  }

  function onCameraChange({detail}) {
    if (
      (detail.name === 'position' || detail.name === 'rotation')
      && !index(detail.oldData, detail.newData)
    ) {
      onMouseMove(lastMouseInfo);
    }
  }

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('touchmove', onTouchMove);
  camera.addEventListener('componentchanged', onCameraChange);

  // The "unlisten" function
  return _ => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('touchmove', onTouchMove);
    camera.removeEventListener('componentchanged', onCameraChange);
  };
}

// Closure to close over the removal of the event listeners
const {didMount, didUnmount} = (function getDidMountAndUnmount() {

  let removeClickListeners;
  let removeDragListeners;
  const cache = [];

  function initialize(THREE, componentName) {

    // TODO: Based on a scene from the element passed in?
    const scene = document.querySelector('a-scene');
    // delay loading of this as we're not 100% if the scene has loaded yet or not
    let camera;
    let draggedElement;
    let dragInfo;
    const positionLog = [];

    function cleanUpPositionLog() {
      const now = performance.now();
      while (positionLog.length && now - positionLog[0].time > TIME_TO_KEEP_LOG) {
        // remove the first element;
        positionLog.shift();
      }
    }

    function onDragged({detail: {nextPosition}}) {
      // Continuously clean up so we don't get huge logs built up
      cleanUpPositionLog();
      positionLog.push({
        position: Object.assign({}, nextPosition),
        time: performance.now(),
      });
    }

    function onMouseDown({clientX, clientY}) {

      const {depth, offset, element} = selectItem(THREE, componentName, camera, clientX, clientY);

      if (element) {
        // Can only drag one item at a time, so no need to check if any
        // listener is already set up
        let removeDragItemListeners = dragItem(
          THREE,
          element,
          offset,
          camera,
          depth,
          {
            clientX,
            clientY,
          }
        );

        draggedElement = element;

        dragInfo = {
          offset: {x: offset.x, y: offset.y, z: offset.z},
          depth,
          clientX,
          clientY,
        };

        element.addEventListener(DRAG_MOVE_EVENT, onDragged);

        removeDragListeners = _ => {
          element.removeEventListener(DRAG_MOVE_EVENT, onDragged);
          // eslint-disable-next-line no-unused-expressions
          removeDragItemListeners && removeDragItemListeners();
          // in case this removal function gets called more than once
          removeDragItemListeners = null;
        };

        element.emit(DRAG_START_EVENT, dragInfo);
      }
    }

    function calculateVelocity() {

      if (positionLog.length < 2) {
        return 0;
      }

      const start = positionLog[positionLog.length - 1];
      const end = positionLog[0];

      const deltaTime = 1000 / (start.time - end.time);
      return {
        x: (start.position.x - end.position.x) * deltaTime, // m/s
        y: (start.position.y - end.position.y) * deltaTime, // m/s
        z: (start.position.z - end.position.z) * deltaTime, // m/s
      };
    }

    function onMouseUp({clientX, clientY}) {

      if (!draggedElement) {
        return;
      }

      cleanUpPositionLog();

      const velocity = calculateVelocity();

      draggedElement.emit(
        DRAG_END_EVENT,
        Object.assign({}, dragInfo, {clientX, clientY, velocity})
      );

      removeDragListeners && removeDragListeners(); // eslint-disable-line no-unused-expressions
      removeDragListeners = undefined;
    }

    function onTouchStart({changedTouches: [touchInfo]}) {
      onMouseDown(touchInfo);
    }

    function onTouchEnd({changedTouches: [touchInfo]}) {
      onMouseUp(touchInfo);
    }

    function run() {

      camera = scene.camera.el;

      // TODO: Attach to canvas?
      document.addEventListener('mousedown', onMouseDown);
      document.addEventListener('mouseup', onMouseUp);

      document.addEventListener('touchstart', onTouchStart);
      document.addEventListener('touchend', onTouchEnd);

      removeClickListeners = _ => {
        document.removeEventListener('mousedown', onMouseDown);
        document.removeEventListener('mouseup', onMouseUp);

        document.removeEventListener('touchstart', onTouchStart);
        document.removeEventListener('touchend', onTouchEnd);
      };

    }

    if (scene.hasLoaded) {
      run();
    } else {
      scene.addEventListener('loaded', run);
    }

  }

  function tearDown() {
    removeClickListeners && removeClickListeners(); // eslint-disable-line no-unused-expressions
    removeClickListeners = undefined;
  }

  return {
    didMount(element, THREE, componentName) {

      if (cache.length === 0) {
        initialize(THREE, componentName);
      }

      if (cache.indexOf(element) === -1) {
        cache.push(element);
      }
    },

    didUnmount(element) {

      const cacheIndex = cache.indexOf(element);

      removeDragListeners && removeDragListeners(); // eslint-disable-line no-unused-expressions
      removeDragListeners = undefined;

      if (cacheIndex === -1) {
        return;
      }

      // remove that element
      cache.splice(cacheIndex, 1);

      if (cache.length === 0) {
        tearDown();
      }

    },
  };
}());

/**
 * @param aframe {Object} The Aframe instance to register with
 * @param componentName {String} The component name to use. Default: 'click-drag'
 */
function aframeDraggableComponent(aframe, componentName = COMPONENT_NAME) {

  const THREE = aframe.THREE;

  /**
   * Draggable component for A-Frame.
   */
  aframe.registerComponent(componentName, {
    schema: {},

    /**
     * Called once when component is attached. Generally for initial setup.
     */
    init() {
      didMount(this, THREE, componentName);
    },

    /**
     * Called when component is attached and when component data changes.
     * Generally modifies the entity based on the data.
     *
     * @param oldData
     */
    update() { },

    /**
     * Called when a component is removed (e.g., via removeAttribute).
     * Generally undoes all modifications to the entity.
     */
    remove() {
      didUnmount(this);
    },

    /**
     * Called when entity pauses.
     * Use to stop or remove any dynamic or background behavior such as events.
     */
    pause() {
      didUnmount(this);
    },

    /**
     * Called when entity resumes.
     * Use to continue or add any dynamic or background behavior such as events.
     */
    play() {
      didMount(this, THREE, componentName);
    },
  });
}

//module.exports = aframeDraggableComponent;

