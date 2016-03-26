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

var Methods = Object.freeze({
  CREATE: 'PUT',
  READ: 'GET',
  UPDATE: 'POST',
  DELETE: 'DELETE'
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
 * @param {Function} ajaxHandler
 * @param {RequestTarget} parentRequest
 * @param {Object} pack
 * @param {Deferred} deferred
 */
function createHandler(ajaxHandler, parentRequest, pack, deferred) {
  var url = getRoute(parentRequest, pack.cmd);
  ajaxHandler(
    Methods.CREATE,
    url,
    pack.value,
    deferred
  );
}

/**
 * @param {Function} ajaxHandler
 * @param {RequestTarget} parentRequest
 * @param {Object} pack
 * @param {Deferred} deferred
 */
function readHandler(ajaxHandler, parentRequest, pack, deferred) {
  var url = getRoute(parentRequest, pack.cmd);
  ajaxHandler(
    Methods.READ,
    url,
    pack.value,
    deferred
  );
}

/**
 * @param {Function} ajaxHandler
 * @param {RequestTarget} parentRequest
 * @param {Object} pack
 * @param {Deferred} deferred
 */
function updateHandler(ajaxHandler, parentRequest, pack, deferred) {
  var url = getRoute(parentRequest, pack.cmd);
  ajaxHandler(
    Methods.UPDATE,
    url,
    pack.value,
    deferred
  );
}

/**
 * @param {Function} ajaxHandler
 * @param {RequestTarget} parentRequest
 * @param {Object} pack
 * @param {Deferred} deferred
 */
function deleteHandler(ajaxHandler, parentRequest, pack, deferred) {
  var url = getRoute(parentRequest, pack.cmd);
  ajaxHandler(
    Methods.DELETE,
    url,
    pack.value,
    deferred
  );
}

function handleWithTimeout(handler) {
  function _handle(parentRequest, pack, deferred, resultRequest) {
    setTimeout(handler, 0, parentRequest, pack, deferred, resultRequest);
  }

  return _handle;
}

/**
 *
 * @param {string} method
 * @param {string} url
 * @param {*} data
 * @param {Deferred} deferred
 */
function jQueryAjaxHandler(method, url, data, deferred) {
  jQuery.ajax({
    method: RESTObject.Methods[method],
    url: url,
    data: data,
    dataType: 'json',
    success: deferred.resolve,
    error: deferred.reject
  });
}

/**
 *
 * @param {string} method
 * @param {string} url
 * @param {*} data
 * @param {Deferred} deferred
 */
function fetchAjaxHandler(method, url, data, deferred) {
  fetch(url, {
    method: RESTObject.Methods[method],
    body: JSON.stringify(data)
  }).then(
    function(response) {
      deferred.resolve(response.json());
    },
    function(response) {
      deferred.reject(response.json());
    }
  );
}

function create(path, ajaxHandler) {

  var _create = createHandler.bind(null, ajaxHandler);
  var _read   = readHandler.bind(null, ajaxHandler);
  var _update = updateHandler.bind(null, ajaxHandler);
  var _delete = deleteHandler.bind(null, ajaxHandler);

  /**
   * @param {RequestTarget} parentRequest
   * @param {Object} pack
   * @param {Deferred} deferred
   * @param {RequestTarget} resultRequest
   */
  function _get(parentRequest, pack, deferred, resultRequest) {
    if (RequestTarget.getQueueLength(resultRequest)) { // RESOURCE/ ROUTE
      routeHandler(parentRequest, pack, deferred);
    } else { // READ
      _read(parentRequest, pack, deferred);
    }
  }

  var descriptors = [
    CommandDescriptor.create(Commands.CREATE, _create),
    CommandDescriptor.create(Commands.READ,   _read),
    CommandDescriptor.create(Commands.UPDATE, _update),
    CommandDescriptor.create(Commands.DELETE, _delete),
    CommandDescriptor.create(Commands.ROUTE,           routeHandler),
    CommandDescriptor.create(Commands.PREVENT_DEFAULT, preventDefault)
  ];

  ProxyCommands.createDescriptors({
               get: handleWithTimeout(_get),
               set: _update,
             apply: _create,
    deleteProperty: _delete
  }, null, descriptors);

  ajaxHandler = ajaxHandler || RESTObject.FETCH;

  var dai = DataAccessInterface.create(descriptors, true);

  // root path
  var root = pool.set((path || typeof(path) === 'string') ? path : '/');
  return dai.parse(root.toJSON());
}

RESTObject = Object.freeze({
  create: create,
  JQUERY: jQueryAjaxHandler,
  FETCH: fetchAjaxHandler,
  Commands: Commands,
  Methods: Methods
});
