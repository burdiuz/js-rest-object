// Uses Node, AMD or browser globals to create a module.
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['event-dispatcher', 'deferred-data-access'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory(require('event-dispatcher'), require('deferred-data-access'));
  } else {
    // Browser globals (root is window)
    root.RESTObject = factory(root.EventDispatcher, root.DataAccessInterface);
  }
}(this, function(EventDispatcher, DataAccessInterface) {
  // here should be injected rest-object.js content
  /**
   * Created by Oleg Galaburda on 25.03.16.
   */
  /*
   List of commands
   .........apply: Create > rest.api.customers({Customer model});
   ........create: ^^^ > rest.api.customers.create({Customer model});
   ...........get: Retrieve > rest.api.customers[1234 Customer Id];
   ..........read: ^^^ > rest.api.customers[1234].read();
   ...........set: Update > rest.api.customers[1234] = {Customer model};
   ........update: ^^^ > rest.api.customers[1234].update({Customer model});
   deleteProperty: Delete > delete rest.api.customers[1234];
   ........delete: ^^^ > rest.api.customers[1234].delete();
   preventDefault: Don't send request, resource > var customers = rest.api.customers.preventDefault(); customers[1234];
   .........route: Create resource adding command value to the URL, rest.route('/api/customers'); or rest['/api/customers/'] should be same, so why do additional?
   */
  
  //------ imports
  var ResourcePool = DataAccessInterface.ResourcePool;
  var CommandDescriptor = DataAccessInterface.CommandDescriptor;
  var ProxyCommands = DataAccessInterface.ProxyCommands;
  var RequestTarget = DataAccessInterface.RequestTarget;
  
  //------ classes
  
  function FakeResourcePool() {
    this.id = 'Fake/ResourcePool';
    this.set = function(target) {
      return target;
    };
    this.has = function() {
      return false;
    };
    this.get = function(target) {
      return target;
    };
    this.remove = function() {
  
    };
    this.clear = function() {
  
    };
    this.isActive = function() {
      return true;
    };
    this.destroy = function() {
    };
    this.addEventListener = function() {
  
    };
    this.hasEventListener = function() {
  
    };
    this.removeEventListener = function() {
  
    };
  }
  function FakeResourcePoolRegistry() {
    var _pool = new FakeResourcePool();
    this.createPool = function() {
      return _pool;
    };
    this.register = function() {
  
    };
    this.get = function(poolId) {
      return _pool.id === poolId ? _pool : null;
    };
    this.isRegistered = function(pool) {
      return pool instanceof ResourcePool ? _pool === pool : _pool.id === pool;
    };
    this.remove = function() {
    };
    this.addEventListener = function() {
  
    };
    this.hasEventListener = function() {
  
    };
    this.removeEventListener = function() {
  
    };
  }
  
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
    deferred.resolve(RequestTarget.toJSON(parentRequest));
  }
  
  /**
   * @param {Function} ajaxHandler
   * @param {RequestTarget} parentRequest
   * @param {Object} pack
   * @param {Deferred} deferred
   */
  function createHandler(ajaxHandler, parentRequest, pack, deferred) {
    var target = pool.get(DataAccessInterface.getResourceId(parentRequest));
    var url = target.resource;
    ajaxHandler('CREATE', url, pack.value, deferred);
  }
  
  /**
   * @param {Function} ajaxHandler
   * @param {RequestTarget} parentRequest
   * @param {Object} pack
   * @param {Deferred} deferred
   */
  function readHandler(ajaxHandler, parentRequest, pack, deferred) {
    var target = pool.get(DataAccessInterface.getResourceId(parentRequest));
    var url = target.resource;
    ajaxHandler('READ', url, pack.value, deferred);
  }
  
  /**
   * @param {Function} ajaxHandler
   * @param {RequestTarget} parentRequest
   * @param {Object} pack
   * @param {Deferred} deferred
   */
  function updateHandler(ajaxHandler, parentRequest, pack, deferred) {
    var target = pool.get(DataAccessInterface.getResourceId(parentRequest));
    var url = target.resource;
    ajaxHandler('UPDATE', url, pack.value, deferred);
  }
  
  /**
   * @param {Function} ajaxHandler
   * @param {RequestTarget} parentRequest
   * @param {Object} pack
   * @param {Deferred} deferred
   */
  function deleteHandler(ajaxHandler, parentRequest, pack, deferred) {
    var target = pool.get(DataAccessInterface.getResourceId(parentRequest));
    var url = target.resource;
    ajaxHandler('DELETE', url, pack.value, deferred);
  }
  
  /**
   * @param {Function} ajaxHandler
   * @param {RequestTarget} parentRequest
   * @param {Object} pack
   * @param {Deferred} deferred
   * @param {RequestTarget} resultRequest
   */
  function getHandler(ajaxHandler, parentRequest, pack, deferred, resultRequest) {
    if (RequestTarget.getQueueLength(resultRequest)) { // RESOURCE/ ROUTE
      routeHandler(parentRequest, pack, deferred);
    } else { // READ
      var url = getRoute(parentRequest, pack.cmd);
      ajaxHandler('READ', url, pack.value, deferred);
    }
  }
  
  /**
   * @param {Function} ajaxHandler
   * @param {RequestTarget} parentRequest
   * @param {Object} pack
   * @param {Deferred} deferred
   */
  function setHandler(ajaxHandler, parentRequest, pack, deferred) {
    var url = getRoute(parentRequest, pack.cmd);
    ajaxHandler('UPDATE', url, pack.value, deferred);
  }
  
  /**
   * @param {Function} ajaxHandler
   * @param {RequestTarget} parentRequest
   * @param {Object} pack
   * @param {Deferred} deferred
   */
  function applyHandler(ajaxHandler, parentRequest, pack, deferred) {
    var target = pool.get(DataAccessInterface.getResourceId(parentRequest));
    var url = target.resource;
    if (pack.value.length === 1) {
      ajaxHandler('CREATE', url, pack.value[0], deferred);
    } else { // can be created a bulk upload and listened via Promise.all
  
    }
  }
  
  /**
   * @param {Function} ajaxHandler
   * @param {RequestTarget} parentRequest
   * @param {Object} pack
   * @param {Deferred} deferred
   */
  function deletePropertyHandler(ajaxHandler, parentRequest, pack, deferred) {
    var url = getRoute(parentRequest, pack.cmd);
    ajaxHandler('DELETE', url, pack.value, deferred);
  }
  
  /**
   * @param {Function} handler
   * @returns {Function}
   */
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
      success: function(response) {
        deferred.resolve(response);
      },
      error: function(xhr) {
        deferred.reject(xhr);
      }
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
      function(error) {
        deferred.reject(error);
      }
    );
  }
  
  function create(path, ajaxHandler) {
    ajaxHandler = ajaxHandler || RESTObject.FETCH;
  
    var descriptors = [
      CommandDescriptor.create(Commands.CREATE, createHandler.bind(null, ajaxHandler)),
      CommandDescriptor.create(Commands.READ, readHandler.bind(null, ajaxHandler)),
      CommandDescriptor.create(Commands.UPDATE, updateHandler.bind(null, ajaxHandler)),
      CommandDescriptor.create(Commands.DELETE, deleteHandler.bind(null, ajaxHandler)),
      CommandDescriptor.create(Commands.ROUTE, routeHandler),
      CommandDescriptor.create(Commands.PREVENT_DEFAULT, preventDefault)
    ];
  
    ProxyCommands.createDescriptors({
      get: handleWithTimeout(getHandler.bind(null, ajaxHandler)),
      set: setHandler.bind(null, ajaxHandler),
      apply: applyHandler.bind(null, ajaxHandler),
      deleteProperty: deletePropertyHandler.bind(null, ajaxHandler)
    }, null, descriptors);
  
    var dai = DataAccessInterface.create(descriptors, true, new FakeResourcePoolRegistry(), null);
  
    // root path
    var root = pool.set((path || typeof(path) === 'string') ? path : '/');
    return dai.parse(root.toJSON());
  }
  
  RESTObject = Object.freeze({
    create: create,
    JQUERY: jQueryAjaxHandler,
    FETCH: fetchAjaxHandler,
    Commands: Commands,
    Methods: Methods,
    DataAccessInterface: DataAccessInterface,
    RequestTarget: DataAccessInterface.RequestTarget
  });
  
  return RESTObject;
}));