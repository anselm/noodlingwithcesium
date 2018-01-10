
AFRAME.registerComponent('csgbuilding', {

  schema: {
    width: {type: 'number', default: 1},
    height: {type: 'number', default: 1},
    depth: {type: 'number', default: 1},
    color: {type: 'color', default: '#AAA'}
  },

  init: function () {

    let data = this.data;
    let el = this.el;

    // - caller is supplying some list of geometries somehow...
    // - could just be primitives
    // - we make them and do the add or subtracts as desired


    var cube_geometry = new THREE.CubeGeometry( 3, 3, 3 );
    var cube_mesh = new THREE.Mesh( cube_geometry );
    cube_mesh.position.x = -7;

    var cube_bsp = new ThreeBSP( cube_mesh );
    var sphere_geometry = new THREE.SphereGeometry( 1.8, 32, 32 );
    var sphere_mesh = new THREE.Mesh( sphere_geometry );
    sphere_mesh.position.x = -7;

    var sphere_bsp = new ThreeBSP( sphere_mesh );
    var subtract_bsp = cube_bsp.subtract( sphere_bsp );

    // adding via 3js support
    // let mygeometry = new THREE.BoxBufferGeometry(data.width, data.height, data.depth);
    this.geometry = subtract_bsp.toGeometry();
    this.geometry.computeVertexNormals();
    this.material = new THREE.MeshStandardMaterial({color: data.color});
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    el.setObject3D('mesh', this.mesh);

  },

  remove: function () {
    this.el.removeObject3D('mesh');
  }

});


