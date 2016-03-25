/**
 * Created by Oleg Galaburda on 25.03.16.
 */
/*
 List of commands
 apply: Create > rest.api.customers({Customer model});
 create: ^^^ > rest.api.customers.create({Customer model});
 get: Retrieve > rest.api.customers[1234 Customer Id];
 read: ^^^ > rest.api.customers[1234].retrieve();
 set: Update > rest.api.customers[1234] = {Customer model};
 update: ^^^ > rest.api.customers[1234].update({Customer model});
 deleteProperty: Delete > delete rest.api.customers[1234];
 delete: ^^^ > rest.api.customers[1234].delete();
 preventDefault: Don't send request, resource > var customers = rest.api.customers.preventDefault(); customers[1234];
 route: Create resource adding command value to the URL, rest.route('/api/customers'); or rest['/api/customers/'] should be same, so why do additional?
 */

//------ imports
var ResourcePool = DataAccessInterface.ResourcePool;
var CommandDescriptor = DataAccessInterface.CommandDescriptor;
var ProxyCommands = DataAccessInterface.ProxyCommands;
var RequestTarget = DataAccessInterface.RequestTarget;


var descriptors;
ResourcePool.setValidTargets(
  ResourcePool.getDefaultValidTargets().concat([typeof('')])
);

var pool = ResourcePool.create();
var Commands = Object.freeze({
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  ROUTE: 'route',
  PREVENT_DEFAULT: 'preventDefault'
});

/**
 * @param {string} base
 * @param {string} path
 * @returns {string}
 */
function compileURL(base, path) {
  var fullPath = '';
  var dirs = base.match(/([^\/\\]+)(?:\/|\\)*/g) || [];
  if (path.charAt() === '/') {
    fullPath += path;
  } else if (path.substr(0, 3) === '../') {
    var pathDirs = path.match(/([^\/\\]+)(?:\/|\\)+/g);
    while (pathDirs.length && dirs.length && pathDirs[0] === '../') {
      pathDirs.shift();
      dirs.pop();
    }
    path = pathDirs.join('') + path.match(/[^\/\\]*$/g)[0];
    fullPath += '/' + dirs.join('');
  } else if (path.substr(0, 2) === './') {
    path = path.substring(2);
    fullPath += '/' + dirs.join('');
  } else {
    fullPath += '/' + dirs.join('');
  }
  return fullPath + '/' + path;
}

/**
 * @param {RequestTarget} request
 * @param {String} path
 * @returns {Object}
 */
function getRoute(request, path) {
  var target = pool.get(DataAccessInterface.getResourceId(request));
  var base = target.resource;
  return compileURL(base, path);
}

/**
 * @param {RequestTarget} request
 * @param {String} path
 * @returns {Object}
 */
function getChildRouteResource(request, path) {
  return pool.set(getRoute(request, path)).toJSON();
}

/**
 * @param {RequestTarget} parentRequest
 * @param {Object} pack
 * @param {Deferred} deferred
 */
function createHandler(parentRequest, pack, deferred) {
  var url = getRoute(parentRequest, pack.cmd);
  jQuery.ajax({
    method: 'PUT',
    url: url,
    data: pack.value,
    dataType: 'json',
    success: function(data) {
      deferred.resolve(data);
    },
    error: function(xhr) {
      deferred.reject(xhr);
    }
  });
}

/**
 * @param {RequestTarget} parentRequest
 * @param {Object} pack
 * @param {Deferred} deferred
 */
function readHandler(parentRequest, pack, deferred) {
  var url = getRoute(parentRequest, pack.cmd);
  jQuery.ajax({
    method: 'GET',
    url: url,
    dataType: 'json',
    success: function(data) {
      deferred.resolve(data);
    },
    error: function(xhr) {
      deferred.reject(xhr);
    }
  });
}

/**
 * @param {RequestTarget} parentRequest
 * @param {Object} pack
 * @param {Deferred} deferred
 */
function updateHandler(parentRequest, pack, deferred) {
  var url = getRoute(parentRequest, pack.cmd);
  jQuery.ajax({
    method: 'POST',
    url: url,
    data: pack.value,
    dataType: 'json',
    success: function(data) {
      deferred.resolve(data);
    },
    error: function(xhr) {
      deferred.reject(xhr);
    }
  });
}

/**
 * @param {RequestTarget} parentRequest
 * @param {Object} pack
 * @param {Deferred} deferred
 */
function deleteHandler(parentRequest, pack, deferred) {
  var url = getRoute(parentRequest, pack.cmd);
  jQuery.ajax({
    method: 'DELETE',
    url: url,
    dataType: 'json',
    success: function(data) {
      deferred.resolve(data);
    },
    error: function(xhr) {
      deferred.reject(xhr);
    }
  });
}

/**
 * @param {RequestTarget} parentRequest
 * @param {Object} pack
 * @param {Deferred} deferred
 */
function routeHandler(parentRequest, pack, deferred) {
  deferred.resolve(getChildRouteResource(
    parentRequest, pack.cmd
  ));
}

/**
 * This command does not even need special treatment
 * @param {RequestTarget} parentRequest
 * @param {Object} pack
 * @param {Deferred} deferred
 */
function preventDefault(parentRequest, pack, deferred) {
  /*
   There should be nothing this command is created just to stick to the queue, so analyzer will that this is resource and not a request.
   */
  deferred.resolve();
}

/**
 * @param {RequestTarget} parentRequest
 * @param {Object} pack
 * @param {Deferred} deferred
 * @param {RequestTarget} resultRequest
 */
function getHandler(parentRequest, pack, deferred, resultRequest) {
  if (RequestTarget.getQueueLength(resultRequest)) { // RESOURCE/ ROUTE
    routeHandler(parentRequest, pack, deferred, resultRequest);
  } else { // READ
    readHandler(parentRequest, pack, deferred, resultRequest);
  }
}

descriptors = [
  CommandDescriptor.create(Commands.CREATE, createHandler),
  CommandDescriptor.create(Commands.READ, readHandler),
  CommandDescriptor.create(Commands.UPDATE, updateHandler),
  CommandDescriptor.create(Commands.DELETE, deleteHandler),
  CommandDescriptor.create(Commands.ROUTE, routeHandler),
  CommandDescriptor.create(Commands.PREVENT_DEFAULT, preventDefault)
];

function handleWithTimeout(handler) {
  function _handle(parentRequest, pack, deferred, resultRequest) {
    setTimeout(handler, 0, parentRequest, pack, deferred, resultRequest);
  }

  return _handle;
}

ProxyCommands.createDescriptors({
  get: handleWithTimeout(getHandler),
  set: updateHandler,
  apply: createHandler,
  deleteProperty: deleteHandler
}, null, descriptors);

var dai = DataAccessInterface.create(descriptors, true);

function createRESTObject(path) {
  // root path
  var root = pool.set(path || '/');
  return dai.parse(root.toJSON());
}
