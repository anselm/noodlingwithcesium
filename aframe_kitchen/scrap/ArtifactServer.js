
var ArtifactServer = {
  // - a client side wrapper for server interactions
};

ArtifactServer.request = function(params,callback) {
  // a consolidated request handler for all server interactions
  // also let's you concatenate a pile of requests
  // for now this just returns some test data
  fetch("data/"+params+".json").then(response => response.json()).then(json => callback(json));
};

/*
ArtifactServer.create = function(params) {
  // - same as write basically, just separated for clarity
}

ArtifactServer.read = function(params) {
  // - return candidate objects
  // - can authenticate an identity here as well
}

ArtifactServer.write = function(params) {
  // - create, revise or otherwise update a document
  // - can also register an identity here
  // - also support versioning here
}

ArtifactServer.remove = function(params) {
  // - delete a document
  // - may support versioning?
}
*/

