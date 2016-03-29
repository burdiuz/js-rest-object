// Uses Node, AMD or browser globals to create a module.
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory();
  } else {
    // Browser globals (root is window)
    root.RESTObject = factory();
  }
}(this, function() {
  var EventDispatcher = (function() {
    /**
     * Created by Oleg Galaburda on 09.02.16.
     */
    
    var Event = (function() {
    
      function toJSON() {
        return {type: this.type, data: this.data};
      }
    
      function Event(type, data) {
        var _defaultPrevented = false;
    
        function isDefaultPrevented() {
          return _defaultPrevented;
        }
    
        function preventDefault() {
          _defaultPrevented = true;
        }
    
        Object.defineProperties(this, {
          type: {
            value: type,
            enumerable: true
          },
          data: {
            value: data || null,
            enumerable: true
          }
        });
        this.preventDefault = preventDefault;
        this.isDefaultPrevented = isDefaultPrevented;
      }
    
      Event.prototype.toJSON = toJSON;
    
      return Event;
    })();
    
    var EventListeners = (function() {
      function add(eventType, handler, priority) {
        var handlers = createList(eventType, priority, this._listeners);
        if (handlers.indexOf(handler) < 0) {
          handlers.push(handler);
        }
      }
    
      function has(eventType) {
        var result = false;
        var priorities = getHashByKey(eventType, this._listeners);
        if (priorities) {
          for (var priority in priorities) {
            if (priorities.hasOwnProperty(priority)) {
              result = true;
              break;
            }
          }
        }
        return result;
      }
    
      function remove(eventType, handler) {
        var priorities = getHashByKey(eventType, this._listeners);
        if (priorities) {
          var list = Object.getOwnPropertyNames(priorities);
          var length = list.length;
          for (var index = 0; index < length; index++) {
            var priority = list[index];
            var handlers = priorities[priority];
            var handlerIndex = handlers.indexOf(handler);
            if (handlerIndex >= 0) {
              handlers.splice(handlerIndex, 1);
              if (!handlers.length) {
                delete priorities[priority];
              }
            }
          }
        }
      }
    
      function removeAll(eventType) {
        delete this._listeners[eventType];
      }
    
      function call(event, target) {
        var _stopped = false;
        var _immediatelyStopped = false;
    
        function stopPropagation() {
          _stopped = true;
        }
    
        function stopImmediatePropagation() {
          _immediatelyStopped = true;
        }
    
        /*
         * Three ways to implement this
         * 1. As its now -- just assign and delete after event cycle finished
         * 2. Use EventDispatcher.setupOptional()
         * 3. In this method create function StoppableEvent that will extend from this event and add these functions,
         *    then instantiate it for this one cycle.
         */
        event.stopPropagation = stopPropagation;
        event.stopImmediatePropagation = stopImmediatePropagation;
        /*
         var rmStopPropagation = EventDispatcher.setupOptional(event, 'stopPropagation', stopPropagation);
         var rmStopImmediatePropagation = EventDispatcher.setupOptional(event, 'stopImmediatePropagation', stopImmediatePropagation);
         */
        var priorities = getHashByKey(event.type, this._listeners);
        if (priorities) {
          var list = Object.getOwnPropertyNames(priorities).sort(function(a, b) {
            return a - b;
          });
          var length = list.length;
          for (var index = 0; index < length; index++) {
            if (_stopped) break;
            var handlers = priorities[list[index]];
            var handlersLength = handlers.length;
            for (var handlersIndex = 0; handlersIndex < handlersLength; handlersIndex++) {
              if (_immediatelyStopped) break;
              var handler = handlers[handlersIndex];
              handler.call(target, event);
            }
          }
        }
        delete event.stopPropagation;
        delete event.stopImmediatePropagation;
        /*
         rmStopPropagation();
         rmStopImmediatePropagation();
         */
      }
    
      function createList(eventType, priority, target) {
        var priorities = getHashByKey(eventType, target, Object);
        return getHashByKey(parseInt(priority), priorities, Array);
      }
    
      function getHashByKey(key, target, definition) {
        var value = null;
        if (target.hasOwnProperty(key)) {
          value = target[key];
        } else if (definition) {
          value = target[key] = new definition();
        }
        return value;
      }
    
      function EventListeners() {
        /**
         * key - event Type
         * value - hash of priorities
         *    key - priority
         *    value - list of handlers
         * @type {Object<string, Object.<string, Array<number, Function>>>}
         * @private
         */
        this._listeners = {};
      }
    
      EventListeners.prototype.add = add;
      EventListeners.prototype.has = has;
      EventListeners.prototype.remove = remove;
      EventListeners.prototype.removeAll = removeAll;
      EventListeners.prototype.call = call;
    
      return EventListeners;
    })();
    
    var EVENTDISPATCHER_NOINIT = {};
    
    /**
     *
     * @param eventPreprocessor {?Function}
     * @constructor
     */
    var EventDispatcher = (function() {
    
      var LISTENERS_FIELD = Symbol('event.dispatcher::listeners');
    
      var PREPROCESSOR_FIELD = Symbol('event.dispatcher::preprocessor');
    
      function EventDispatcher(eventPreprocessor) {
        if (eventPreprocessor === EVENTDISPATCHER_NOINIT) {
          // create noinit prototype
          return;
        }
        /**
         * @type {EventListeners}
         */
        Object.defineProperty(this, LISTENERS_FIELD, {
          value: new EventListeners()
        });
        Object.defineProperty(this, PREPROCESSOR_FIELD, {
          value: eventPreprocessor
        });
      }
    
    
      function _addEventListener(eventType, listener, priority) {
        this[LISTENERS_FIELD].add(eventType, listener, -priority || 0);
      }
    
      function _hasEventListener(eventType) {
        return this[LISTENERS_FIELD].has(eventType);
      }
    
      function _removeEventListener(eventType, listener) {
        this[LISTENERS_FIELD].remove(eventType, listener);
      }
    
      function _removeAllEventListeners(eventType) {
        this[LISTENERS_FIELD].removeAll(eventType);
      }
    
      function _dispatchEvent(event, data) {
        var eventObject = EventDispatcher.getEvent(event, data);
        if (this[PREPROCESSOR_FIELD]) {
          eventObject = this[PREPROCESSOR_FIELD].call(this, eventObject);
        }
        this[LISTENERS_FIELD].call(eventObject);
      }
    
      EventDispatcher.prototype.addEventListener = _addEventListener;
      EventDispatcher.prototype.hasEventListener = _hasEventListener;
      EventDispatcher.prototype.removeEventListener = _removeEventListener;
      EventDispatcher.prototype.removeAllEventListeners = _removeAllEventListeners;
      EventDispatcher.prototype.dispatchEvent = _dispatchEvent;
    
      function EventDispatcher_isObject(value) {
        return (typeof value === 'object') && (value !== null);
      }
    
      function EventDispatcher_getEvent(eventOrType, optionalData) {
        var event = eventOrType;
        if (!EventDispatcher.isObject(eventOrType)) {
          event = new EventDispatcher.Event(String(eventOrType), optionalData);
        }
        return event;
      }
    
      function EventDispatcher_create(eventPreprocessor) {
        return new EventDispatcher(eventPreprocessor);
      }
    
      function EventDispatcher_createNoInitPrototype() {
        return new EventDispatcher(EVENTDISPATCHER_NOINIT);
      }
    
      /*
       function setupOptional(target, name, value) {
       var cleaner = null;
       if (name in target) {
       cleaner = function() {
       };
       } else {
       target[name] = value;
       cleaner = function() {
       delete target[name];
       };
       }
       return cleaner;
       }
       EventDispatcher.setupOptional = setupOptional;
       */
    
      EventDispatcher.isObject = EventDispatcher_isObject;
    
      EventDispatcher.getEvent = EventDispatcher_getEvent;
      EventDispatcher.create = EventDispatcher_create;
      EventDispatcher.createNoInitPrototype = EventDispatcher_createNoInitPrototype;
      EventDispatcher.Event = Event;
      return EventDispatcher;
    })();
    
    return EventDispatcher;
  })();
  var DataAccessInterface = (function() {
    /**
     * Created by Oleg Galaburda on 29.03.16.
     */
    var DataAccessInterface = (function() {
      'use strict';
      var TargetStatus = Object.freeze({
        PENDING: 'pending',
        RESOLVED: 'resolved',
        REJECTED: 'rejected',
        DESTROYED: 'destroyed'
      });
      
      
      var TARGET_INTERNALS = Symbol('request.target:internals');
      var TARGET_DATA = 'resource::data';
      
      var getId = (function() {
        var _base = 'DA/' + String(Date.now()) + '/';
        var _index = 0;
        return function() {
          return _base + String(++_index) + '/' + String(Date.now());
        };
      })();
      
      var Deferred = (function() {
      
        /**
         * @constructor
         */
        function Deferred() {
          this._status = TargetStatus.PENDING;
          this.promise = new Promise(function(resolve, reject) {
            this._resolveHandler = resolve;
            this._rejectHandler = reject;
          }.bind(this));
          Object.defineProperties(this, {
            status: {
              get: get_status
            }
          });
        }
      
        function get_status() {
          return this._status;
        }
      
        function _resolve() {
          var result = this._resolveHandler.apply(null, arguments);
          // changing status later will keep same it in case of Promise internal error
          this._status = TargetStatus.RESOLVED;
          return result;
        }
      
        function _reject() {
          var result = this._rejectHandler.apply(null, arguments);
          this._status = TargetStatus.REJECTED;
          return result;
        }
      
        Deferred.prototype.resolve = _resolve;
        Deferred.prototype.reject = _reject;
      
        return Deferred;
      })();
      
      /**
       * @returns {Deferred}
       */
      function createDeferred() {
        return new Deferred();
      }
      
      function areProxiesAvailable() {
        return typeof(Proxy) === 'function';
      }
      
      /**
       * Interface for all resource types, these will be treated as resources automatically
       * @constructor
       */
      function IConvertible() {
      
      }
      
      function getRAWResource(object, pool) {
        pool = pool || ResourcePoolRegistry.defaultResourcePool;
        var data = null;
        if (object instanceof TargetResource) {
          data = object.toJSON();
        } else if (typeof(object[TARGET_INTERNALS]) === 'object') {
          data = RequestTarget.toJSON(object);
        } else if (object instanceof IConvertible || typeof(object) === 'function') {
          data = pool.set(object).toJSON();
        } else if (isResource(object)) {
          data = object;
        }
        return data;
      }
      
      function getResourceData(object) {
        var data = getRAWResource(object);
        return data ? data[TARGET_DATA] : null;
      }
      
      function getResourceId(object) {
        var id = null;
        //if (object instanceof TargetResource || object instanceof RequestTarget) {
        if (typeof(object[TARGET_INTERNALS]) === 'object') {
          id = object[TARGET_INTERNALS].id;
        } else if (isResource(object)) {
          id = object[TARGET_DATA].id;
        }
        return id;
      }
      
      function getResourcePoolId(object) {
        var poolId = null;
        if (typeof(object[TARGET_INTERNALS]) === 'object') {
          poolId = object[TARGET_INTERNALS].poolId;
        } else if (isResource(object)) {
          poolId = object[TARGET_DATA].poolId;
        }
        return poolId;
      }
      
      function getResourceType(object) {
        var type = null;
        if (typeof(object[TARGET_INTERNALS]) === 'object') {
          type = object[TARGET_INTERNALS].type;
        } else if (isResource(object)) {
          type = object[TARGET_DATA].type;
        }
        return type;
      }
      
      function isResource(object) {
        return object instanceof TargetResource ||
          object instanceof RequestTarget ||
          (object && (
            // this case for RequestTargets and TargetResources which contain data in TARGET_INTERNALS Symbol
            // We check for their types above but in cases when Proxies are enabled their type will be Function
            // and verification will come to this case
            typeof(object[TARGET_INTERNALS]) === 'object' ||
            // this case for RAW resources passed via JSON conversion, look like {'resource::data': {id: '1111', poolId: '22222'}}
            typeof(object[TARGET_DATA]) === 'object'
          ));
      }
      
      function isResourceConvertible(data) {
        return isResource(data) || typeof(data) === 'function' || data instanceof IConvertible;
      }
      
      'use strict';
      var CommandDescriptor = (function() {
      
        /**
         * @returns {boolean}
         */
        function Default_isTemporary() {
          return false;
        }
      
        /**
         * Immutable
         * @param {String|Object} type
         * @param {Function} handle
         * @param {String|Symbol} [name=]
         * @param {Function} [isTemporary=]
         * @constructor
         */
        function CommandDescriptor(type, handle, name, isTemporary, cacheable) {
          /**
           * @type {String|Symbol}
           */
          this.name = name !== undefined ? name : type;
          /**
           * @type {String|Object}
           */
          this.type = type;
          /**
           * @type {Function}
           */
          this.handle = handle;
          /**
           * @type {Function}
           */
          this.isTemporary = isTemporary || Default_isTemporary;
      
          this.cacheable = Boolean(cacheable);
        }
      
        // Since its VO it should not contain any methods that may change its internal state
      
        //---------------
      
        /**
         *
         * @param {string} command
         * @param {Function} handle
         * @param {string} [name=]
         * @param {Function} [isTemporary=]
         * @param {Boolean} [cacheable=false]
         * @returns {CommandDescriptor}
         */
        function CommandDescriptor_create(command, handle, name, isTemporary, cacheable) {
          var descriptor = new CommandDescriptor(command, handle, name, isTemporary, cacheable);
          // We can use Object.freeze(), it keeps class/constructor information
          return Object.freeze(descriptor);
        }
      
        CommandDescriptor.create = CommandDescriptor_create;
      
        return CommandDescriptor;
      })();
      
      function descriptorGeneratorFactory(command, name) {
        return function descriptorSetter(handle, isTemporary, target) {
          var descriptor = CommandDescriptor.create(command, handle, name, isTemporary);
          if (target instanceof Array) {
            target.push(descriptor);
          } else if (target) {
            target[name] = descriptor;
          }
          return descriptor;
        }
      }
      
      /**
       * Destroy is unique type that exists for every RequestTarget and does not have a method on its instances.
       * This type will be send each time RequestTarget.destroy() is applied to RequestTarget in stance.
       * @type {Object}
       */
      var RequestTargetCommands = Object.freeze({
        DESTROY: '::destroy.resource'
      });
      
      /**
       * Commands used by Proxy wrapper to get/set properties and call functions/methods.
       * @type {Object}
       */
      var ProxyCommands = (function() {
        var GET_FIELD = Symbol('proxy.commands::get');
        var SET_FIELD = Symbol('proxy.commands::set');
        var APPLY_FIELD = Symbol('proxy.commands::apply');
        var DELETE_PROPERTY_FIELD = Symbol('proxy.commands::deleteProperty');
      
        var commands = {
          GET: 'get',
          SET: 'set',
          APPLY: 'apply',
          DELETE_PROPERTY: 'deleteProperty'
        };
        commands.fields = Object.freeze({
          get: GET_FIELD,
          set: SET_FIELD,
          apply: APPLY_FIELD,
          deleteProperty: DELETE_PROPERTY_FIELD
        });
      
        function get_list() {
          return [commands.GET, commands.SET, commands.APPLY, commands.DELETE_PROPERTY];
        }
      
        function get_required() {
          return [commands.GET, commands.SET, commands.APPLY];
        }
      
        function createDescriptors(handlers, isTemporary, target) {
          var handler, name, field, descriptor;
          var list = ProxyCommands.list;
          var length = list.length;
          target = target || {};
          for (var index = 0; index < length; index++) {
            name = list[index];
            handler = handlers[name];
            field = ProxyCommands.fields[name];
            if (handler instanceof Function) {
              descriptor = CommandDescriptor.create(name, handler, field, isTemporary);
              if (target instanceof Array) {
                target.push(descriptor);
              } else if (target) {
                target[field] = descriptor;
              }
            }
          }
          return target;
        }
      
        Object.defineProperties(commands, {
          list: {
            get: get_list
          },
          required: {
            get: get_required
          }
        });
      
        commands.createGETDescriptor = descriptorGeneratorFactory(commands.GET, commands.fields.get);
        commands.createSETDescriptor = descriptorGeneratorFactory(commands.SET, commands.fields.set);
        commands.createAPPLYDescriptor = descriptorGeneratorFactory(commands.APPLY, commands.fields.apply);
        commands.createDescriptors = createDescriptors;
        return Object.freeze(commands);
      })();
      
      
      var Reserved = Object.freeze({
        names: Object.freeze({
          //INFO Exposed Promise method, cannot be overwritten by type
          then: true,
          //INFO Exposed Promise method, cannot be overwritten by type
          catch: true
        }),
        commands: Object.freeze({
          '::destroy.resource': true
        })
      });
      
      'use strict';
      var TargetResource = (function() {
        /**
         * The object that can be used to send Target to other side
         * @constructor
         */
        function TargetResource(_pool, _resource, resourceType, _id) {
          Object.defineProperty(this, TARGET_INTERNALS, { // private read-only property
            value: {
              active: true,
              pool: _pool,
              poolId: _pool ? _pool.id : null,
              resource: _resource,
              type: resourceType,
              id: _id
            }
          });
          Object.defineProperty(this, TARGET_DATA, {
            get: get_TARGET_DATA
          });
      
          Object.defineProperties(this, {
            active: {
              get: get_active
            },
            poolId: {
              get: get_poolId
            },
            resource: {
              get: get_resource
            },
            type: {
              get: get_type
            },
            id: {
              get: get_id
            }
          });
        }
      
        function get_TARGET_DATA() {
          return this.toJSON();
        }
      
        function get_active() {
          return Boolean(this[TARGET_INTERNALS].active);
        }
      
        function get_poolId() {
          return this[TARGET_INTERNALS].poolId;
        }
      
        function get_resource() {
          return this[TARGET_INTERNALS].resource;
        }
      
        function get_type() {
          return this[TARGET_INTERNALS].type || typeof(this[TARGET_INTERNALS].resource);
        }
      
        function get_id() {
          return this[TARGET_INTERNALS].id;
        }
      
        function _toJSON() {
          var data = {};
          data[TARGET_DATA] = {
            id: this[TARGET_INTERNALS].id,
            type: this.type,
            poolId: this.poolId
          };
          return data;
        }
      
        function _destroy() {
          var id = this[TARGET_INTERNALS].id;
          var pool = this[TARGET_INTERNALS].pool;
      
          if (!this[TARGET_INTERNALS].active) {
            return;
          }
          this[TARGET_INTERNALS].active = false;
      
          pool.remove(id);
      
          for (var name in this[TARGET_INTERNALS]) {
            delete this[TARGET_INTERNALS][name];
          }
        }
      
        TargetResource.prototype.toJSON = _toJSON;
        TargetResource.prototype.destroy = _destroy;
      
        function TargetResource_create(pool, target, targetType, id) {
          return new TargetResource(pool, target, targetType, id || getId());
        }
      
        TargetResource.create = TargetResource_create;
      
        return TargetResource;
      })();
      
      'use strict';
      /**
       * @constructor
       * @extends EventDispatcher
       */
      var ResourcePool = (function() {
      
        var ResourcePoolEvents = Object.freeze({
          RESOURCE_ADDED: 'resourceAdded',
          RESOURCE_REMOVED: 'resourceRemoved',
          POOL_CLEAR: 'poolClear',
          POOL_CLEARED: 'poolCleared',
          POOL_DESTROYED: 'poolDestroyed'
        });
      
        /**
         * Map private field symbol
         */
        var MAP_FIELD = Symbol('ResourcePool::map');
        var validTargets = {};
      
        /**
         * @ignore
         */
        function ResourcePool() {
          this[MAP_FIELD] = new Map();
      
          Object.defineProperties(this, {
            id: {
              value: getId()
            }
          });
      
          EventDispatcher.apply(this);
        }
      
        //------------ instance
      
        function _set(target, type) {
          var link = null;
          if (ResourcePool.isValidTarget(target)) {
            if (this[MAP_FIELD].has(target)) {
              link = this[MAP_FIELD].get(target);
            } else {
              link = TargetResource.create(this, target, type || typeof(target));
              this[MAP_FIELD].set(link.id, link);
              this[MAP_FIELD].set(target, link);
              if (this.hasEventListener(ResourcePoolEvents.RESOURCE_ADDED)) {
                this.dispatchEvent(ResourcePoolEvents.RESOURCE_ADDED, link);
              }
            }
          }
          return link;
        }
      
        function _has(target) {
          return this[MAP_FIELD].has(target);
        }
      
        function _get(target) {
          return this[MAP_FIELD].get(target);
        }
      
        function _remove(target) {
          var link = this[MAP_FIELD].get(target);
          if (link) {
            this[MAP_FIELD].delete(link.id);
            this[MAP_FIELD].delete(link.resource);
            if (this.hasEventListener(ResourcePoolEvents.RESOURCE_REMOVED)) {
              this.dispatchEvent(ResourcePoolEvents.RESOURCE_REMOVED, link);
            }
            link.destroy();
          }
        }
      
        function _clear() {
          if (this.hasEventListener(ResourcePoolEvents.POOL_CLEAR)) {
            this.dispatchEvent(ResourcePoolEvents.POOL_CLEAR, this);
          }
          var key;
          var keys = this[MAP_FIELD].keys();
          //FIXME update to for...of loop when it comes to browsers
          while (!(key = keys.next()).done) {
            if (typeof(key.value) === 'string') {
              var link = this[MAP_FIELD].get(key.value);
              link.destroy();
            }
          }
          this[MAP_FIELD].clear();
          if (this.hasEventListener(ResourcePoolEvents.POOL_CLEARED)) {
            this.dispatchEvent(ResourcePoolEvents.POOL_CLEARED, this);
          }
        }
      
        function _isActive() {
          return Boolean(this[MAP_FIELD]);
        }
      
        function _destroy() {
          this.clear();
          // intentionally make it not usable after its destroyed
          delete this[MAP_FIELD];
          if (this.hasEventListener(ResourcePoolEvents.POOL_DESTROYED)) {
            this.dispatchEvent(ResourcePoolEvents.POOL_DESTROYED, this);
          }
        }
      
        ResourcePool.prototype = EventDispatcher.createNoInitPrototype();
        ResourcePool.prototype.constructor = ResourcePool;
      
        ResourcePool.prototype.set = _set;
        ResourcePool.prototype.has = _has;
        ResourcePool.prototype.get = _get;
        ResourcePool.prototype.remove = _remove;
        ResourcePool.prototype.clear = _clear;
        ResourcePool.prototype.isActive = _isActive;
        ResourcePool.prototype.destroy = _destroy;
      
        //------------ static
      
        function ResourcePool_isValidTarget(target) {
          return !isResource(target) && Boolean(validTargets[typeof(target)]);
        }
      
        /**
         *
         * @param list {string[]} Types acceptable as resource targets to be stored in ResourcePool
         * @returns void
         */
        function ResourcePool_setValidTargets(list) {
          validTargets = {};
          var length = list.length;
          for (var index = 0; index < length; index++) {
            validTargets[list[index]] = true;
          }
        }
      
        /**
         *
         * @returns {string[]} Default types acceptable by ResourcePool
         * @returns Array
         */
        function ResourcePool_getDefaultValidTargets() {
          return ['object', 'function'];
        }
      
        /**
         *
         * @returns {ResourcePool}
         */
        function ResourcePool_create() {
          return new ResourcePool();
        }
      
        //FIXME make these to be instance modifiers, not global or both
        ResourcePool.isValidTarget = ResourcePool_isValidTarget;
        ResourcePool.setValidTargets = ResourcePool_setValidTargets;
        ResourcePool.getDefaultValidTargets = ResourcePool_getDefaultValidTargets;
        ResourcePool.create = ResourcePool_create;
        ResourcePool.Events = ResourcePoolEvents;
      
        // setting default valid targets
        ResourcePool.setValidTargets(ResourcePool.getDefaultValidTargets());
      
        return ResourcePool;
      })();
      
      'use strict';
      /**
       * Global registry per environment
       */
      var ResourcePoolRegistry = (function() {
      
        var ResourcePoolRegistryEvents = Object.freeze({
          RESOURCE_POOL_CREATED: 'resourcePoolCreated',
          RESOURCE_POOL_REGISTERED: 'resourcePoolRegistered',
          RESOURCE_POOL_REMOVED: 'resourcePoolRemoved'
        });
      
        var POOLS_FIELD = Symbol('resource.pool.registry::pools');
      
        function _poolDestroyedListener(event) {
          this.remove(event.data);
        }
      
        /**
         * @constructor
         * @extends {ResourcePool}
         * @private
         */
        function _DefaultResourcePool() {
          ResourcePool.apply(this);
          //INFO default ResourcePool should not be destroyable;
          this.destroy = function() {
            throw new Error('Default ResourcePool cannot be destroyed.');
          };
        }
      
        _DefaultResourcePool.prototype = ResourcePool.prototype;
      
        /**
         * @constructor
         */
        function ResourcePoolRegistry() {
          Object.defineProperty(this, POOLS_FIELD, {
            value: {}
          });
          EventDispatcher.apply(this);
          this._poolDestroyedListener = _poolDestroyedListener.bind(this);
          // every registry should keep default pool, so you can access from anywhere
          this.register(ResourcePoolRegistry.defaultResourcePool);
        }
      
        /**
         *
         * @returns {ResourcePool}
         */
        function _createPool() {
          var pool = ResourcePool.create();
          if (this.hasEventListener(ResourcePoolRegistryEvents.RESOURCE_POOL_CREATED)) {
            this.dispatchEvent(ResourcePoolRegistryEvents.RESOURCE_POOL_CREATED, pool);
          }
          this.register(pool);
          return pool;
        }
      
        /**
         *
         * @param pool {ResourcePool}
         */
        function _register(pool) {
          if (this[POOLS_FIELD].hasOwnProperty(pool.id)) return;
          this[POOLS_FIELD][pool.id] = pool;
          pool.addEventListener(ResourcePool.Events.POOL_DESTROYED, this._poolDestroyedListener);
          if (this.hasEventListener(ResourcePoolRegistryEvents.RESOURCE_POOL_REGISTERED)) {
            this.dispatchEvent(ResourcePoolRegistryEvents.RESOURCE_POOL_REGISTERED, pool);
          }
        }
      
        /**
         *
         * @param poolId {String}
         * @returns {ResourcePool|null}
         */
        function _get(poolId) {
          return this[POOLS_FIELD][poolId] || null;
        }
      
        /**
         *
         * @param pool {ResourcePool|String}
         * @returns {Boolean}
         */
        function _isRegistered(pool) {
          return this[POOLS_FIELD].hasOwnProperty(pool instanceof ResourcePool ? pool.id : String(pool));
        }
      
        /**
         *
         * @param pool {ResourcePool|String}
         * @returns {Boolean}
         */
        function _remove(pool) {
          var result = false;
          pool = pool instanceof ResourcePool ? pool : this.get(pool);
          if (pool) {
            pool.removeEventListener(ResourcePool.Events.POOL_DESTROYED, this._poolDestroyedListener);
            result = delete this[POOLS_FIELD][pool.id];
          }
          if (this.hasEventListener(ResourcePoolRegistryEvents.RESOURCE_POOL_REMOVED)) {
            this.dispatchEvent(ResourcePoolRegistryEvents.RESOURCE_POOL_REMOVED, pool);
          }
          return result;
        }
      
        ResourcePoolRegistry.prototype = EventDispatcher.createNoInitPrototype();
        ResourcePoolRegistry.prototype.constructor = ResourcePoolRegistry;
        ResourcePoolRegistry.prototype.createPool = _createPool;
        ResourcePoolRegistry.prototype.register = _register;
        ResourcePoolRegistry.prototype.get = _get;
        ResourcePoolRegistry.prototype.isRegistered = _isRegistered;
        ResourcePoolRegistry.prototype.remove = _remove;
      
        //--------------- static
      
      
        function ResourcePoolRegistry_create() {
          return new ResourcePoolRegistry();
        }
      
        ResourcePoolRegistry.create = ResourcePoolRegistry_create;
        ResourcePoolRegistry.Events = ResourcePoolRegistryEvents;
        ResourcePoolRegistry.defaultResourcePool = new _DefaultResourcePool();
      
        return ResourcePoolRegistry;
      })();
      
      'use strict';
      var ResourceConverter = (function() {
      
        /**
         * @private
         */
        var FACTORY_FIELD = Symbol('resource.converter::factory');
      
        /**
         * @private
         */
        var REGISTRY_FIELD = Symbol('resource.converter::resourcePoolRegistry');
      
        /**
         * @private
         */
        var POOL_FIELD = Symbol('resource.converter::resourcePool');
      
        /**
         * @private
         */
        var ResourceConverterEvents = Object.freeze({
          RESOURCE_CREATED: 'resourceCreated',
          RESOURCE_CONVERTED: 'resourceConverted'
        });
      
        /**
         * @param {RequestFactory} factory
         * @param {ResourcePoolRegistry} registry
         * @param {ResourcePool} pool
         * @param {RequestHandlers} handlers
         * @extends EventDispatcher
         * @constructor
         */
        function ResourceConverter(factory, registry, pool, handlers) {
          this[FACTORY_FIELD] = factory;
          this[POOL_FIELD] = pool;
          this[REGISTRY_FIELD] = registry;
          EventDispatcher.apply(this);
          if (handlers) {
            handlers.setConverter(this);
          }
        }
      
        function _resourceToObject(data) {
          var result;
      
          if (isResourceConvertible(data)) {
            result = getRAWResource(data, this[POOL_FIELD]);
          } else if (typeof(data.toJSON) === 'function') {
            result = data.toJSON();
          } else {
            result = data;
          }
      
          if (result !== data && this.hasEventListener(ResourceConverterEvents.RESOURCE_CONVERTED)) {
            this.dispatchEvent(ResourceConverterEvents.RESOURCE_CONVERTED, {
              data: data,
              result: result
            });
          }
      
          return result;
        }
      
        function _objectToResource(data) {
          var result = data;
          var poolId;
          if (isResource(data)) {
            poolId = getResourcePoolId(data);
            if (this[REGISTRY_FIELD].isRegistered(poolId)) { // target object is stored in current pool
              var target = this[REGISTRY_FIELD].get(poolId).get(getResourceId(data));
              if (target) {
                result = target.resource;
              }
            } else { // target object has another origin, should be wrapped
              result = this[FACTORY_FIELD].create(Promise.resolve(data));
            }
          }
          if (result !== data && this.hasEventListener(ResourceConverterEvents.RESOURCE_CREATED)) {
            this.dispatchEvent(ResourceConverterEvents.RESOURCE_CREATED, {
              data: data,
              result: result
            });
          }
          return result;
        }
      
        function _lookupArray(list, linkConvertHandler) {
          var result = [];
          var length = list.length;
          for (var index = 0; index < length; index++) {
            result[index] = linkConvertHandler.call(this, list[index]);
          }
          return result;
        }
      
        function _lookupObject(data, linkConvertHandler) {
          var result = {};
          for (var name in data) {
            if (!data.hasOwnProperty(name)) continue;
            result[name] = linkConvertHandler.call(this, data[name]);
          }
          return result;
        }
      
        function _toJSON(data) {
          var result = data;
          if (data !== undefined && data !== null) {
            if (isResourceConvertible(data)) { // if data is RequestTarget, TargetResource, IConvertible, Function or RAW resource data
              result = this.resourceToObject(data);
            } else if (data instanceof Array) { // if data is Array of values, check its
              result = this.lookupArray(data, this.resourceToObject);
            } else if (data.constructor === Object) { // only Object instances can be looked up, other object types must be converted by hand
              result = this.lookupObject(data, this.resourceToObject);
            }
          }
          return result;
        }
      
        function _parse(data) {
          var result = data;
          if (data !== undefined && data !== null) {
            if (isResource(data)) { // if data is RAW resource data
              result = this.objectToResource(data);
            } else if (data instanceof Array) { // if data is Array of values, check its
              result = this.lookupArray(data, this.objectToResource);
            } else if (data.constructor === Object) {
              result = this.lookupObject(data, this.objectToResource);
            }
          }
          return result;
        }
      
        function _lookupForPending(data) {
          var result = [];
      
          function add(value) {
            if (RequestTarget.isPending(value)) {
              result.push(value);
            }
            return value;
          }
      
          if (typeof(data) === 'object' && data !== null) {
            if (RequestTarget.isPending(data)) {
              result.push(data);
            } else if (data instanceof Array) {
              this.lookupArray(data, add);
            } else if (data.constructor === Object) {
              this.lookupObject(data, add);
            }
          }
          return result;
        }
      
        ResourceConverter.prototype = EventDispatcher.createNoInitPrototype();
        ResourceConverter.prototype.constructor = ResourceConverter;
        ResourceConverter.prototype.toJSON = _toJSON;
        ResourceConverter.prototype.parse = _parse;
        ResourceConverter.prototype.lookupArray = _lookupArray;
        ResourceConverter.prototype.lookupObject = _lookupObject;
        ResourceConverter.prototype.lookupForPending = _lookupForPending;
        ResourceConverter.prototype.resourceToObject = _resourceToObject;
        ResourceConverter.prototype.objectToResource = _objectToResource;
      
        //------------------------ static
      
        /**
         * @param {RequestFactory} factory
         * @param {ResourcePoolRegistry} registry
         * @param {ResourcePool} pool
         * @param {RequestHandlers} handlers
         * @returns {ResourceConverter}
         */
        function ResourceConverter_create(factory, registry, pool, handlers) {
          return new ResourceConverter(factory, registry, pool, handlers);
        }
      
        ResourceConverter.create = ResourceConverter_create;
        ResourceConverter.Events = ResourceConverterEvents;
      
        return ResourceConverter;
      })();
      
      'use strict';
      var RequestHandlers = (function() {
      
        var RequestHandlersEvents = Object.freeze({
          HANDLERS_UPDATED: 'handlersUpdated'
        });
      
        /**
         * @constructor
         */
        function RequestHandlers(proxyEnabled) {
          var _keys = [];
          var _descriptors = {};
          var _converter;
      
          proxyEnabled = Boolean(proxyEnabled);
      
          Object.defineProperties(this, {
            proxyEnabled: {
              value: proxyEnabled
            },
            available: {
              get: function() {
                return Boolean(_keys.length);
              }
            }
          });
      
          function _setConverter(converter) {
            _converter = converter;
          }
      
          function _setHandlers(handlers) {
            _descriptors = {};
            RequestHandlers.filterHandlers(handlers, _descriptors);
            _keys = Object.getOwnPropertyNames(_descriptors).concat(Object.getOwnPropertySymbols(_descriptors));
            if (proxyEnabled) {
              RequestHandlers.areProxyHandlersAvailable(_descriptors, true);
            }
          }
      
          function _hasHandler(type) {
            return _descriptors.hasOwnProperty(type);
          }
      
          function _getHandlers() {
            return _descriptors;
          }
      
          function _getHandlerNames() {
            return _keys.slice();
          }
      
          function _getHandler(type) {
            return _descriptors[type] || null;
          }
      
          function _handle(parentRequest, name, pack, deferred, resultRequest) {
            var list = _converter ? _converter.lookupForPending(pack.value) : null;
            if (list && list.length) {
              // FIXME Need to test on all platforms: In other browsers this might not work because may need list of Promise objects, not RequestTargets
              Promise.all(list).then(function() {
                _handleImmediately(parentRequest, name, pack, deferred, resultRequest);
              });
            } else {
              _handleImmediately(parentRequest, name, pack, deferred, resultRequest);
            }
          }
      
          function _handleImmediately(parentRequest, name, data, deferred, resultRequest) {
            var handler = _getHandler(name);
            if (handler instanceof CommandDescriptor) {
              //INFO result should be applied to deferred.resolve() or deferred.reject()
              handler.handle(parentRequest, data, deferred, resultRequest);
            } else {
              throw new Error('Command descriptor for "' + name + '" was not found.');
            }
      
          }
      
          this.setConverter = _setConverter;
          /**
           * @param {Array<Number, CommandDescriptor>, Object<String, Function|CommandDescriptor>} handlers
           */
          this.setHandlers = _setHandlers;
          this.hasHandler = _hasHandler;
          this.getHandlers = _getHandlers;
          this.getHandlerNames = _getHandlerNames;
          this.getHandler = _getHandler;
          this.handle = _handle;
          this[Symbol.iterator] = function() {
            return new RequestHandlersIterator(this.getHandlers(), this.getHandlerNames());
          };
        }
      
        function RequestHandlersIterator(_data, _keys) {
          var _length = _keys.length;
          var _index = -1;
      
          function _next() {
            var result;
            if (++_index >= _length) {
              result = {done: true};
            } else {
              result = {value: _data[_keys[_index]], done: false};
            }
            return result;
          }
      
          this.next = _next;
          this[Symbol.iterator] = function() {
            return this;
          }.bind(this);
        }
      
        //------------------- static
      
        var RequestHandlers_filterHandlers = (function() {
          /**
           * @param {Array} handlers
           * @param {Object} descriptors
           * @returns {void}
           */
          function filterArray(handlers, descriptors) {
            var length = handlers.length;
            for (var index = 0; index < length; index++) {
              var value = handlers[index];
              if (value instanceof CommandDescriptor) {
                applyDescriptor(value, descriptors);
              }
            }
          }
      
          /**
           * @param {Object} handlers
           * @param {Object} descriptors
           * @returns {void}
           */
          function filterHash(handlers, descriptors) {
            if(!handlers) return;
            var keys = Object.getOwnPropertyNames(handlers).concat(Object.getOwnPropertySymbols(handlers));
            var length = keys.length;
            for (var index = 0; index < length; index++) {
              var name = keys[index];
              var value = handlers[name];
              if (typeof(value) === 'function') {
                value = CommandDescriptor.create(name, value);
              }
              if (value instanceof CommandDescriptor) {
                applyDescriptor(value, descriptors);
              }
            }
          }
      
          /**
           * Checks for CommandDescriptor uniqueness and reserved words usage.
           * @param {CommandDescriptor} descriptor
           * @param descriptors
           */
          function applyDescriptor(descriptor, descriptors) {
            var name = descriptor.name;
            var type = descriptor.type;
            if (type in Reserved.commands) {
              throw new Error('Command "' + type + '" is reserved and cannot be used in descriptor.');
            }
            if (name in Reserved.names) {
              throw new Error('Name "' + name + '" is reserved and cannot be used in descriptor.');
            }
            if (descriptors.hasOwnProperty(name) && descriptors[name] instanceof CommandDescriptor) {
              throw new Error('Field names should be unique, "' + String(name) + '" field has duplicates.');
            }
            descriptors[name] = descriptor;
          }
      
          /**
           *
           * @param {Array|Object} handlers
           * @param {Object<String, CommandDescriptor>} descriptors
           * @returns {void}
           */
          function RequestHandlers_filterHandlers(handlers, descriptors) {
            if (handlers instanceof Array) {
              filterArray(handlers, descriptors);
            } else {
              filterHash(handlers, descriptors);
            }
          }
      
          return RequestHandlers_filterHandlers;
        })();
      
        /**
         * @returns {RequestHandlers}
         */
        function RequestHandlers_create(proxyEnabled) {
          return new RequestHandlers(proxyEnabled);
        }
      
        function RequestHandlers_areProxyHandlersAvailable(handlers, throwError) {
          var result = true;
          var list = ProxyCommands.required;
          var length = list.length;
          for (var index = 0; index < length; index++) {
            var name = list[index];
            if (!(ProxyCommands.fields[name] in handlers)) {
              result = false;
              if (throwError) {
                throw new Error('For Proxy interface, handler "' + name + '" should be set.');
              }
            }
          }
          return result;
        }
      
        RequestHandlers.filterHandlers = RequestHandlers_filterHandlers;
        RequestHandlers.areProxyHandlersAvailable = RequestHandlers_areProxyHandlersAvailable;
        RequestHandlers.create = RequestHandlers_create;
        RequestHandlers.Events = RequestHandlersEvents;
        return RequestHandlers;
      })
      ();
      
      /**
       * Created by Oleg Galaburda on 29.03.16.
       */
      'use strict';
      
      var CommandHandlerFactory = (function() {
        function CommandHandlerFactory() {
          var _members = new Map();
          var _factory;
      
          /**
           * @param {CommandDescriptor} descriptor
           * @returns {Function}
           * @private
           */
          function _get(descriptor) {
            var propertyName = descriptor.name;
            if (!_members.has(propertyName)) {
              _members.set(propertyName, _create(descriptor.name, descriptor.type, descriptor.isTemporary, descriptor.cacheable));
            }
            return _members.get(propertyName);
          }
      
          function _create(propertyName, commandType, isTemporary, cacheable) {
      
            function _commandHandler(command, value) {
              var result;
              var promise;
              if (this[TARGET_INTERNALS]) {
                var pack = RequestTargetInternals.createRequestPackage(commandType, command, value, this[TARGET_INTERNALS].id);
                var request = getChildRequest(propertyName, pack, cacheable);
                result = request.child;
                if (request.deferred) {
                  promise = this[TARGET_INTERNALS].sendRequest(propertyName, pack, request.deferred, result);
                  if (!promise) {
                    result = null;
                  }
                  promise = checkState(promise, isTemporary, this, result, pack);
                }
              } else {
                promise = Promise.reject(new Error('Target object is not a resource, so cannot be used for calls.'));
              }
              return result || _factory.create(promise);
            }
      
            return _commandHandler;
          }
      
          function getChildRequest(propertyName, pack, cacheable) {
            var child, deferred;
            if (cacheable) {
              child = _factory.getCached(propertyName, pack);
            }
            if (!child) {
              deferred = createDeferred();
              if (cacheable) {
                child = _factory.createCached(deferred.promise, propertyName, pack);
              } else {
                child = _factory.create(deferred.promise, propertyName, pack);
              }
            }
            return {child: child, deferred: deferred};
          }
      
          function checkState(promise, isTemporary, parentRequest, childRequest, pack) {
            if (promise) {
              promise.then(function(data) {
                RequestTarget.setTemporary(childRequest, Boolean(isTemporary(parentRequest, childRequest, pack, data)));
              });
            } else {
              promise = Promise.reject(new Error('Initial request failed and didn\'t result in promise.'));
            }
            return promise;
          }
      
          function _setFactory(factory) {
            _factory = factory;
          }
      
          function _getFactory() {
            return _factory;
          }
      
          this.get = _get;
      
          this.setFactory = _setFactory;
          this.getFactory = _getFactory;
        }
      
        return CommandHandlerFactory;
      })();
      
      'use strict';
      
      var RequestTargetDecorator = (function() {
      
        /**
         *
         * @param {RequestFactory} _factory
         * @param {RequestHandlers} _handlers
         * @constructor
         */
        function RequestTargetDecorator(_factory, _handlers) {
      
          var _members = new CommandHandlerFactory();
          _members.setFactory(_factory);
      
          function _apply(request) {
            if (!_handlers.available) return;
            /* FIXME revert change when ES6 will be supported widely
             for (var descriptor of _handlers) {
             request[descriptor.name] = _getMember(descriptor.name, descriptor.type);
             }
             */
            var iterator = _handlers[Symbol.iterator]();
            var result;
            while (!(result = iterator.next()).done) {
              var descriptor = result.value;
              request[descriptor.name] = _members.get(descriptor);
            }
            return request;
          }
      
          function _setFactory(factory) {
            if (factory) {
              _members.setFactory(factory);
            }
          }
      
          function _getFactory() {
            return _members.getFactory();
          }
      
          this.apply = _apply;
          this.setFactory = _setFactory;
          this.getFactory = _getFactory;
        }
      
        //------------------- static
      
        /**
         * @param handlers {RequestHandlers}
         * @returns {RequestTargetDecorator}
         * @constructor
         */
        function RequestTargetDecorator_create(factory, handlers) {
          return new RequestTargetDecorator(factory, handlers);
        }
      
        RequestTargetDecorator.create = RequestTargetDecorator_create;
      
        return RequestTargetDecorator;
      })();
      
      
      'use strict';
      var FACTORY_DECORATOR_FIELD = Symbol('request.factory::decorator');
      
      var FACTORY_HANDLERS_FIELD = Symbol('request.factory::handlers');
      
      var RequestFactory = (function() {
        var NOINIT = {};
        /*
         function DummyCacheImpl() {
         this.get = function(name, pack) {
      
         };
         this.set = function(name, pack, request) {
      
         };
         }
         */
        function RequestFactory(handlers, _cacheImpl) {
          if (handlers === NOINIT) {
            return;
          }
          this[FACTORY_HANDLERS_FIELD] = handlers;
          this[FACTORY_DECORATOR_FIELD] = RequestTargetDecorator.create(this, handlers);
      
          Object.defineProperties(this, {
            cache: {
              value: _cacheImpl || null
            }
          });
        }
      
        function _create(promise) {
          var request = RequestTarget.create(promise, this[FACTORY_HANDLERS_FIELD]);
          if (this[FACTORY_HANDLERS_FIELD].available) {
            this[FACTORY_DECORATOR_FIELD].apply(request);
          }
          return request;
        }
      
        function _getCached(name, pack) {
          return this.cache && this.cache.get(name, pack);
        }
      
        function _createCached(promise, name, pack) {
          var request = null;
          if(this.cache){
            request = this.create(promise);
            this.cache.set(name, pack, request);
          }
          return request;
        }
      
        RequestFactory.prototype.create = _create;
        RequestFactory.prototype.getCached = _getCached;
        RequestFactory.prototype.createCached = _createCached;
      
        //------------------- static
      
        function RequestFactory_create(handlers, cacheImpl) {
          return new RequestFactory(handlers, cacheImpl);
        }
      
        function RequestFactory_createNoInitPrototype() {
          return new RequestFactory(NOINIT);
        }
      
        RequestFactory.create = RequestFactory_create;
      
        RequestFactory.createNoInitProtoype = RequestFactory_createNoInitPrototype;
      
        return RequestFactory;
      })();
      
      'use strict';
      var RequestProxyFactory = (function() {
      
        var FACTORY_FIELD = Symbol('request.proxy.factory::factory');
      
        var EXCLUSIONS = {
          /*
           INFO arguments and caller were included because they are required function properties
           https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/arguments
           */
          'arguments': true,
          'caller': true,
          'prototype': true
        };
      
        function applyProxy(target, handlers) {
          function RequestTargetProxy() {
          }
      
          RequestTargetProxy.target = target;
          return new Proxy(RequestTargetProxy, handlers);
        }
      
        function Proxy_set(wrapper, name, value) {
          var result;
          var target = wrapper.target;
          if (name in target || name in EXCLUSIONS || typeof(name) === 'symbol') {
            result = target[name] = value;
          } else {
            result = target[ProxyCommands.fields.set](name, value);
          }
          return result;
        }
      
        function Proxy_has(wrapper, name) {
          return wrapper.target.hasOwnProperty(name);
        }
      
        function Proxy_deleteProperty(wrapper, name) {
          var result = false;
          var target = wrapper.target;
          if (ProxyCommands.fields.deleteProperty in target) {
            target[ProxyCommands.fields.deleteProperty](name);
            result = true;
          }
          return result;
        }
      
        function Proxy_ownKeys() {
          return Object.getOwnPropertyNames(EXCLUSIONS);
        }
      
        function Proxy_enumerate() {
          return Object.getOwnPropertyNames(EXCLUSIONS)[Symbol.iterator]();
        }
      
        function Proxy_getOwnPropertyDescriptor(wrapper, name) {
          var descr;
          if (EXCLUSIONS.hasOwnProperty(name)) {
            descr = Object.getOwnPropertyDescriptor(wrapper, name);
          } else {
            descr = Object.getOwnPropertyDescriptor(wrapper.target, name);
          }
          return descr;
        }
      
        /**
         * Builds proper handlers hash for Proxy
         * @returns {Function}
         */
        function createHandlers() {
          var handlers;
      
          function Proxy_get(wrapper, name) {
            var value;
            var target = wrapper.target;
            if (name in target || name in EXCLUSIONS || typeof(name) === 'symbol') {
              value = target[name];
            } else {
              value = target[ProxyCommands.fields.get](name);
              /* this makes double proxying, since its create()d with proxy already
              value = applyProxy(
                target[ProxyCommands.fields.get](name),
                handlers
              );
              */
            }
            return value;
          }
      
          function Proxy_apply(wrapper, thisValue, args) {
            return wrapper.target[ProxyCommands.fields.apply](null, args);
            /* this makes double proxying, since its create()d with proxy already
            return applyProxy(
              //INFO type is null because target is function we are calling now,
              // thisValue is being ignored for now
              wrapper.target[ProxyCommands.fields.apply](null, args),
              handlers
            );
            */
          }
      
          handlers = {
            'get': Proxy_get,
            'apply': Proxy_apply,
            'set': Proxy_set,
            'has': Proxy_has,
            'deleteProperty': Proxy_deleteProperty,
            'ownKeys': Proxy_ownKeys,
            'enumerate': Proxy_enumerate,
            'getOwnPropertyDescriptor': Proxy_getOwnPropertyDescriptor
          };
      
          return handlers;
        }
      
        var PROXY_HANDLERS = createHandlers();
      
        function RequestProxyFactory(handlers, cacheImpl) {
          this[FACTORY_HANDLERS_FIELD] = handlers;
          this[FACTORY_FIELD] = RequestFactory.create(handlers, cacheImpl);
          this[FACTORY_FIELD][FACTORY_DECORATOR_FIELD].setFactory(this);
        }
      
        function _create(promise) {
          var instance = this[FACTORY_FIELD].create(promise);
          if (this[FACTORY_HANDLERS_FIELD].available) {
            instance = applyProxy(instance, PROXY_HANDLERS);
          }
          return instance;
        }
      
        function _getCached(name, pack) {
          return this[FACTORY_FIELD].getCached(name, pack);
        }
      
        function _createCached(promise, name, pack) {
          var instance = this[FACTORY_FIELD].createCached(promise, name, pack);
          if (this[FACTORY_HANDLERS_FIELD].available) {
            instance = applyProxy(instance, PROXY_HANDLERS);
          }
          return instance;
        }
      
        RequestProxyFactory.prototype = RequestFactory.createNoInitProtoype();
        RequestProxyFactory.prototype.constructor = RequestProxyFactory;
        RequestProxyFactory.prototype.create = _create;
        RequestProxyFactory.prototype.getCached = _getCached;
        RequestProxyFactory.prototype.createCached = _createCached;
      
        //------------------- static
      
        function RequestProxyFactory_applyProxy(target) {
          return applyProxy(target, PROXY_HANDLERS);
        }
      
        function RequestProxyFactory_create(handlers, cacheImpl) {
          return new RequestProxyFactory(handlers, cacheImpl);
        }
      
        RequestProxyFactory.create = RequestProxyFactory_create;
        RequestProxyFactory.applyProxy = RequestProxyFactory_applyProxy;
      
        return RequestProxyFactory;
      })();
      
      'use strict';
      var RequestTargetInternals = (function() {
      
        /**
         *
         * @param _requestTarget {RequestTarget}
         * @param _promise {Promise}
         * @param _requestHandlers {RequestHandlers}
         * @constructor
         */
        function RequestTargetInternals(_requestTarget, _promise, _requestHandlers) {
          this.requestHandlers = _requestHandlers;
          this.requestTarget = _requestTarget;
          this.link = {};
          //INFO this should be not initialized i.e. keep it undefined, this will be checked later
          this.temporary;
          this.hadChildPromises = false;
          this.status = TargetStatus.PENDING;
          this.queue = [];
          this.children = [];
          this._deferred = createDeferred();
          this.promise = this._deferred.promise;
      
          Object.defineProperties(this, {
            poolId: {
              get: get_poolId
            },
            type: {
              get: get_type
            },
            id: {
              get: get_id
            }
          });
      
          _promise.then(
            _resolveHandler.bind(this),
            _rejectHandler.bind(this)
          );
        }
      
        function get_poolId() {
          return this.link.poolId || null;
        }
      
        function get_type() {
          return this.link.type || null;
        }
      
        function get_id() {
          return this.link.id || null;
        }
      
        function _resolveHandler(value) {
          this.status = TargetStatus.RESOLVED;
          if (isResource(value)) {
            this.link = getResourceData(value);
            //INFO Sending "this" as result of resolve() handler, causes infinite loop of this.then(), so I've used wrapper object
            //FIXME Check if Proxy wrapper will work with promise result, probably not
            value = {target: this.requestTarget};
            this._sendQueue();
            //In theory, at time of these lines executing, "temporary" property should be already set via _commandHandler() set from RequestTargetDecorator
            if (this.temporary) {
              this.destroy();
            }
          } else { // else { value must be passed as is }
            this._rejectQueue('Target of the call is not a resource and call cannot be sent.');
          }
          this._deferred.resolve(value);
          delete this._deferred;
        }
      
        function _rejectHandler(value) {
          this.status = TargetStatus.REJECTED;
          this._rejectQueue('Target of the call was rejected and call cannot be sent.');
          this._deferred.reject(value);
          delete this._deferred;
        }
      
        function _sendQueue() {
          while (this.queue && this.queue.length) {
            var request = this.queue.shift();
            var name = request[0];
            var pack = request[1];
            var deferred = request[2];
            var child = request[3];
            pack.target = this.link.id;
            this._handleRequest(name, pack, deferred, child);
          }
          this.queue = null;
        }
      
        function _rejectQueue(message) {
          var error = new Error(message || 'This request was rejected before sending.');
          while (this.queue && this.queue.length) {
            /**
             * @type {[string, {type:string, cmd:string, value:*, target:string}, Deferred]}
             */
            var request = this.queue.shift();
            request[2].reject(error);
          }
          this.queue = null;
        }
      
        function _sendRequest(name, pack, deferred, child) {
          var promise = null;
          if (this.requestHandlers.hasHandler(name)) {
            promise = this._applyRequest(name, pack, deferred || createDeferred(), child);
          } else {
            throw new Error('Request handler for "' + name + '" is not registered.');
          }
          if (child) {
            this.registerChild(child);
          }
          return promise;
        }
      
        function _addToQueue(name, pack, deferred, child) {
          this.queue.push([name, pack, deferred, child]);
        }
      
      
        function _applyRequest(name, pack, deferred, child) {
          var promise = deferred.promise;
          switch (this.status) {
            case TargetStatus.PENDING:
              this._addToQueue(name, pack, deferred, child);
              break;
            case TargetStatus.REJECTED:
              promise = Promise.reject(new Error('Target object was rejected and cannot be used for calls.'));
              break;
            case TargetStatus.DESTROYED:
              promise = Promise.reject(new Error('Target object was destroyed and cannot be used for calls.'));
              break;
            case TargetStatus.RESOLVED:
              this._handleRequest(name, pack, deferred, child);
              break;
          }
          return promise;
        }
      
        function _handleRequest(name, pack, deferred, child) {
          this.requestHandlers.handle(this.requestTarget, name, pack, deferred, child);
        }
      
        function _registerChild(childRequestTarget) {
          var handler = _onChildHandled.bind(this, childRequestTarget);
          var promise = RequestTarget.getRawPromise(childRequestTarget);
          this.children.push(childRequestTarget);
          promise.then(handler, handler);
        }
      
        function _onChildHandled(childRequestTarget) {
          if (this.children) {
            var index = this.children.indexOf(childRequestTarget);
            if (index >= 0) {
              this.children.splice(index, 1);
            }
          }
        }
      
      
        function _isActive() {
          return this.status === TargetStatus.PENDING || this.status === TargetStatus.RESOLVED;
        }
      
        function _canBeDestroyed() {
          return this.status === TargetStatus.RESOLVED || this.status === TargetStatus.REJECTED;
        }
      
        function _destroy() {
          var promise = null;
          if (this.canBeDestroyed()) {
            //INFO I should not clear children list, since they are pending and requests already sent.
            if (this.status === TargetStatus.RESOLVED) {
              promise = this.sendRequest(RequestTargetCommands.DESTROY, RequestTargetInternals.createRequestPackage(
                RequestTargetCommands.DESTROY,
                null,
                null,
                this.id
              ));
            } else {
              promise = Promise.resolve();
            }
            this.status = TargetStatus.DESTROYED;
          } else {
            promise = Promise.reject(new Error('Invalid or already destroyed target.'));
          }
          return promise;
        }
      
        function _then() {
          var child = this.promise.then.apply(this.promise, arguments);
          if (child) {
            this.hadChildPromises = true;
          }
          return child;
        }
      
        function _catch() {
          var child = this.promise.catch.apply(this.promise, arguments);
          if (child) {
            this.hadChildPromises = true;
          }
          return child;
        }
      
        function _toJSON() {
          var data = {};
          data[TARGET_DATA] = {
            id: this.link.id,
            type: this.link.type,
            poolId: this.link.poolId
          };
          return data;
        }
      
        RequestTargetInternals.prototype._sendQueue = _sendQueue;
        RequestTargetInternals.prototype._rejectQueue = _rejectQueue;
        RequestTargetInternals.prototype.sendRequest = _sendRequest;
        RequestTargetInternals.prototype._addToQueue = _addToQueue;
        RequestTargetInternals.prototype._applyRequest = _applyRequest;
        RequestTargetInternals.prototype._handleRequest = _handleRequest;
        RequestTargetInternals.prototype.registerChild = _registerChild;
        RequestTargetInternals.prototype.isActive = _isActive;
        RequestTargetInternals.prototype.canBeDestroyed = _canBeDestroyed;
        RequestTargetInternals.prototype.destroy = _destroy;
        RequestTargetInternals.prototype.then = _then;
        RequestTargetInternals.prototype.catch = _catch;
        RequestTargetInternals.prototype.toJSON = _toJSON;
      
        //----------- static
      
        function _createRequestPackage(type, cmd, value, targetId) {
          return {
            type: type,
            cmd: cmd,
            value: value,
            target: targetId
          };
        }
      
        RequestTargetInternals.createRequestPackage = _createRequestPackage;
      
        return RequestTargetInternals;
      })();
      
      'use strict';
      var RequestTarget = (function() {
      
        var PROMISE_FIELD = Symbol('request.target::promise');
      
        /**
         * The object that will be available on other side
         * @param _promise {Promise}
         * @param _requestHandlers {RequestHandlers}
         * @constructor
         */
        function RequestTarget(_promise, _requestHandlers) {
          var promiseHandler;
          Object.defineProperty(this, TARGET_INTERNALS, {
            value: new RequestTargetInternals(this, _promise, _requestHandlers),
            configurable: true
          });
          promiseHandler = _promiseResolutionHandler.bind(this, _promise);
          _promise.then(promiseHandler, promiseHandler);
        }
      
        function _promiseResolutionHandler(_promise, data) {
          if (!isResource(data)) {
            this[PROMISE_FIELD] = _promise;
            delete this[TARGET_INTERNALS];
          }
        }
      
        function _then() {
          var target = this[TARGET_INTERNALS] || this[PROMISE_FIELD];
          target.then.apply(target, arguments);
        }
      
        function _catch() {
          var target = this[TARGET_INTERNALS] || this[PROMISE_FIELD];
          target.catch.apply(target, arguments);
        }
      
        RequestTarget.prototype.then = _then;
        RequestTarget.prototype.catch = _catch;
      
        //------------- static
        function RequestTarget_isActive(target) {
          return target && target[TARGET_INTERNALS] ? target[TARGET_INTERNALS].isActive() : false;
        }
      
        function RequestTarget_canBeDestroyed(target) {
          return target && target[TARGET_INTERNALS] ? target[TARGET_INTERNALS].canBeDestroyed() : false;
        }
      
        function RequestTarget_destroy(target) {
          return target && target[TARGET_INTERNALS] ? target[TARGET_INTERNALS].destroy() : null;
        }
      
        function RequestTarget_toJSON(target) {
          return target && target[TARGET_INTERNALS] ? target[TARGET_INTERNALS].toJSON() : null;
        }
      
        function RequestTarget_isPending(value) {
          return RequestTarget_getStatus(value) == TargetStatus.PENDING;
        }
      
        function RequestTarget_isTemporary(target) {
          return target && target[TARGET_INTERNALS] && target[TARGET_INTERNALS].temporary;
        }
      
        function RequestTarget_setTemporary(target, value) {
          if (target && target[TARGET_INTERNALS]) {
            target[TARGET_INTERNALS].temporary = Boolean(value);
          }
        }
      
        function RequestTarget_getStatus(target) {
          return target && target[TARGET_INTERNALS] ? target[TARGET_INTERNALS].status : null;
        }
      
        function RequestTarget_getQueueLength(target) {
          var list = target && target[TARGET_INTERNALS] ? target[TARGET_INTERNALS].queue : null;
          return list ? list.length : 0;
        }
      
        function RequestTarget_getQueueCommands(target) {
          var length;
          var result = [];
          var queue = target && target[TARGET_INTERNALS] ? target[TARGET_INTERNALS].queue : null;
          if (queue) {
            length = queue.length;
            for (var index = 0; index < length; index++) {
              result.push(queue[index][0].type);
            }
          }
          return result;
        }
      
        function RequestTarget_hadChildPromises(target) {
          return Boolean(target && target[TARGET_INTERNALS] && target[TARGET_INTERNALS].hadChildPromises);
        }
      
        function RequestTarget_getRawPromise(target) {
          return target && target[TARGET_INTERNALS] ? target[TARGET_INTERNALS].promise : null;
        }
      
        function RequestTarget_getChildren(target) {
          var list = target && target[TARGET_INTERNALS] ? target[TARGET_INTERNALS].children : null;
          return list ? list.slice() : [];
        }
      
        function RequestTarget_getLastChild(target) {
          var list = target && target[TARGET_INTERNALS] ? target[TARGET_INTERNALS].children : null;
          return list && list.length ? list[list.length-1] : null;
        }
      
        function RequestTarget_getChildrenCount(target) {
          var list = target && target[TARGET_INTERNALS] ? target[TARGET_INTERNALS].children : null;
          return list ? list.length : 0;
        }
      
        /**
         *
         * @param promise {Promise}
         * @param requestHandlers {RequestHandlers}
         * @returns {RequestTarget}
         * @constructor
         */
        function RequestTarget_create(promise, requestHandlers) {
          return new RequestTarget(promise, requestHandlers);
        }
      
        RequestTarget.isActive = RequestTarget_isActive;
        RequestTarget.canBeDestroyed = RequestTarget_canBeDestroyed;
        RequestTarget.destroy = RequestTarget_destroy;
        RequestTarget.toJSON = RequestTarget_toJSON;
        RequestTarget.isPending = RequestTarget_isPending;
        RequestTarget.isTemporary = RequestTarget_isTemporary;
        RequestTarget.setTemporary = RequestTarget_setTemporary;
        RequestTarget.getStatus = RequestTarget_getStatus;
        RequestTarget.getQueueLength = RequestTarget_getQueueLength;
        RequestTarget.getQueueCommands = RequestTarget_getQueueCommands;
        RequestTarget.hadChildPromises = RequestTarget_hadChildPromises;
        RequestTarget.getRawPromise = RequestTarget_getRawPromise;
        RequestTarget.getChildren = RequestTarget_getChildren;
        RequestTarget.getLastChild = RequestTarget_getLastChild;
        RequestTarget.getChildrenCount = RequestTarget_getChildrenCount;
        RequestTarget.create = RequestTarget_create;
      
        return RequestTarget;
      })();
      
      'use strict';
      var DataAccessInterface = (function() {
      
        /**
         *
         * @param handlers
         * @param {} proxyEnabled
         * @param {ResourcePoolRegistry} [_poolRegistry]
         * @param {ResourcePool} [_pool]
         * @constructor
         */
        function DataAccessInterface(handlers, proxyEnabled, _poolRegistry, _pool, _cacheImpl) {
          proxyEnabled = Boolean(proxyEnabled);
          if (proxyEnabled && !areProxiesAvailable()) {
            throw new Error('Proxies are not available in this environment');
          }
          var _handlers = RequestHandlers.create(proxyEnabled);
          var _factory = (proxyEnabled ? RequestProxyFactory : RequestFactory).create(_handlers, _cacheImpl);
          _poolRegistry = _poolRegistry || ResourcePoolRegistry.create();
          if (_pool) {
            _poolRegistry.register(_pool);
          } else if (_pool !== undefined) {
            _pool = _poolRegistry.createPool();
          } else {
            _pool = ResourcePoolRegistry.defaultResourcePool;
          }
          Object.defineProperties(this, {
            poolRegistry: {
              value: _poolRegistry
            },
            pool: {
              get: function() {
                return _pool;
              }
            },
            resourceConverter: {
              value: ResourceConverter.create(_factory, _poolRegistry, _pool, _handlers)
            },
            factory: {
              value: _factory
            },
            proxyEnabled: {
              get: function() {
                return _handlers.proxyEnabled;
              }
            }
          });
      
          function poolDestroyedHandler() {
            _pool.removeEventListener(ResourcePool.Events.POOL_DESTROYED, poolDestroyedHandler);
            _pool = _poolRegistry.createPool();
            _pool.addEventListener(ResourcePool.Events.POOL_DESTROYED, poolDestroyedHandler);
          }
      
          _handlers.setHandlers(handlers);
          _pool.addEventListener(ResourcePool.Events.POOL_DESTROYED, poolDestroyedHandler);
        }
      
        function _parse(data) {
          return this.resourceConverter.parse(data);
        }
      
        function _toJSON(data) {
          return this.resourceConverter.toJSON(data);
        }
      
        DataAccessInterface.prototype.parse = _parse;
        DataAccessInterface.prototype.toJSON = _toJSON;
      
        //------------------ static
      
        function DataAccessInterface_create(handlers, proxyEnabled, poolRegistry, pool, cacheImpl) {
          return new DataAccessInterface(handlers, proxyEnabled, poolRegistry, pool, cacheImpl);
        }
      
        DataAccessInterface.create = DataAccessInterface_create;
        DataAccessInterface.createDeferred = createDeferred;
      
        DataAccessInterface.IConvertible = IConvertible;
        DataAccessInterface.RequestTarget = RequestTarget;
        DataAccessInterface.Deferred = Deferred;
        DataAccessInterface.Reserved = Reserved;
        DataAccessInterface.RequestTargetCommands = RequestTargetCommands;
        DataAccessInterface.CommandDescriptor = CommandDescriptor;
        DataAccessInterface.ProxyCommands = ProxyCommands;
        DataAccessInterface.ResourcePool = ResourcePool;
        DataAccessInterface.ResourcePoolRegistry = ResourcePoolRegistry;
        DataAccessInterface.ResourceConverter = ResourceConverter;
        DataAccessInterface.getRAWResource = getRAWResource;
        DataAccessInterface.getResourceData = getResourceData;
        DataAccessInterface.getResourceId = getResourceId;
        DataAccessInterface.getResourcePoolId = getResourcePoolId;
        DataAccessInterface.getResourceType = getResourceType;
        DataAccessInterface.isResource = isResource;
        DataAccessInterface.isResourceConvertible = isResourceConvertible;
      
        return DataAccessInterface;
      })();
      
      
      return DataAccessInterface;
    })();
    
    return DataAccessInterface;
  })();
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
  
  var HTTPMethods = Object.freeze({
    create: 'PUT',
    read: 'GET',
    update: 'POST',
    delete: 'DELETE'
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
    ajaxHandler(Commands.CREATE, url, pack.cmd, pack.value, deferred);
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
    ajaxHandler(Commands.READ, url, pack.cmd, pack.value, deferred);
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
    ajaxHandler(Commands.UPDATE, url, pack.cmd, pack.value, deferred);
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
    ajaxHandler(Commands.DELETE, url, pack.cmd, pack.value, deferred);
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
      ajaxHandler(Commands.READ, url, pack.value, null, deferred);
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
    ajaxHandler(Commands.UPDATE, url, pack.value, null, deferred);
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
    var length = pack.value.length;
    if (length === 1) {
      ajaxHandler(Commands.CREATE, url, pack.value[0], null, deferred);
    } else if (length > 1) {
      //TODO can be created a bulk upload and listened via Promise.all
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
    ajaxHandler(Commands.DELETE, url, pack.value, null, deferred);
  }
  
  function destroyHandler(parentRequest, pack, deferred) {
    pool.remove(pack.target);
    deferred.resolve();
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
  function jQueryAjaxHandler(method, url, data, params, deferred) {
    if (params) {
      url += (url.indexOf('?') < 0 ? '?' : '&') + jQuery.param(params);
    }
    jQuery.ajax({
      method: RESTObject.HTTPMethods[method],
      url: url,
      data: data ? JSON.stringify(data) : null,
      dataType: 'json',
      contentType: 'application/json; charset=utf-8',
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
  var fetchAjaxHandler = (function() {
    var _fetchAjaxHeaders;
  
    function serialize(url, obj) {
      return url + (url.indexOf('?') < 0 ? '?' : '&') + Object.keys(obj).reduce(function(a, k) {
          a.push(encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]));
          return a;
        }, []).join('&');
    }
  
    function fetchAjaxHandler(method, url, data, params, deferred) {
      if (!_fetchAjaxHeaders) {
        _fetchAjaxHeaders = new Headers();
        _fetchAjaxHeaders.append('Content-Type', 'application/json; charset=utf-8');
      }
      var request = {
        method: RESTObject.HTTPMethods[method]
      };
      if (params) {
        url = serialize(url, params);
      }
      if (data) {
        request.headers = _fetchAjaxHeaders;
        request.body = JSON.stringify(data);
      }
      fetch(url, request).then(
        function(response) {
          deferred.resolve(response.json());
        },
        function(error) {
          deferred.reject(error);
        }
      );
    }
  
    return fetchAjaxHandler;
  })();
  
  function create(path, ajaxHandler, proxyEnabled) {
    ajaxHandler = ajaxHandler || RESTObject.FETCH;
  
    var descriptors = [
      CommandDescriptor.create(Commands.CREATE, createHandler.bind(null, ajaxHandler)),
      CommandDescriptor.create(Commands.READ, readHandler.bind(null, ajaxHandler)),
      CommandDescriptor.create(Commands.UPDATE, updateHandler.bind(null, ajaxHandler)),
      CommandDescriptor.create(Commands.DELETE, deleteHandler.bind(null, ajaxHandler)),
      CommandDescriptor.create(Commands.ROUTE, routeHandler),
      CommandDescriptor.create(Commands.PREVENT_DEFAULT, preventDefault),
      //FIXME How to add handler not adding a property? make RequestTargetCommands like ProxyCommands with Symbol() property
      // And it cannot be added because reserved :) fix it
      //CommandDescriptor.create(DataAccessInterface.RequestTargetCommands.DESTROY, destroyHandler, Symbol(DataAccessInterface.RequestTargetCommands.DESTROY))
  
    ];
  
    ProxyCommands.createDescriptors({
      get: handleWithTimeout(getHandler.bind(null, ajaxHandler)),
      set: setHandler.bind(null, ajaxHandler),
      apply: applyHandler.bind(null, ajaxHandler),
      deleteProperty: deletePropertyHandler.bind(null, ajaxHandler)
    }, null, descriptors);
  
    var dai = DataAccessInterface.create(descriptors, proxyEnabled !== false, new FakeResourcePoolRegistry(), null);
  
    // root path
    var root = pool.set((path || typeof(path) === 'string') ? path : '/');
    return dai.parse(root.toJSON());
  }
  
  function getDeepestChild(target) {
    var child;
    while (child = RequestTarget.getLastChild(target)) {
      target = child;
    }
    return target;
  }
  
  RESTObject = Object.freeze({
    create: create,
    JQUERY: jQueryAjaxHandler,
    FETCH: fetchAjaxHandler,
    Commands: Commands,
    HTTPMethods: HTTPMethods,
    DataAccessInterface: DataAccessInterface,
    RequestTarget: RequestTarget,
    getDeepestChild: getDeepestChild
  });
  
  return RESTObject;
}));
