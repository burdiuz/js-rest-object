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
    root.createRESTObject = factory(root.EventDispatcher, root.DataAccessInterface);
  }
}(this, function(EventDispatcher, DataAccessInterface) {
  // here should be injected rest-object.js content
  //=include rest-object.js
  return createRESTObject;
}));
