/**
 * Created by Oleg Galaburda on 23.07.15.
 */
'use strict';

var lastId = 20;

var customers = (function() {
  var fnames = ['Alex', 'Mark', 'David', 'Pater', 'Meg', 'Stewie', 'Oleg', 'Steve', 'Bill', 'John'];
  var lnames = ['Mile', 'Testovich', 'Meter', 'Inch', 'Cm', 'Tonn', 'Pound', 'Currency', 'Whatelse', 'Whoknows', 'Doe'];
  var cmpnies = ['Campaney', 'Comp Inc', 'Windows Inc', 'Beds Inc', 'Bottle Inc', 'Table Inc', 'Chair Inc', 'Phone Inc', 'Elgoog Inc', 'Employee Inc', 'Slavery Inc', 'Dark Science of XX Century Inc'];
  var data = {};
  var length = lastId;
  while (length--) {
    var item = {
      id: String(length + 1),
      name: fnames[(Math.random() * fnames.length) >> 0] + ' ' + lnames[(Math.random() * lnames.length) >> 0],
      company: cmpnies[(Math.random() * cmpnies.length) >> 0],
      age: 25 + parseInt(Math.random() * 35),
      phone: '000-555-55-55',
      address: String((Math.random() * 500) >> 0) + ' Street st.'
    };
    data[item.id] = item;
  }
  return data;
})();

var express = require('express');
var bodyParser = require('body-parser');

var app = express();
app.use(bodyParser.json()); // for parsing application/json
//app.use(bodyParser.urlencoded({extended: true})); // for parsing application/x-www-form-urlencoded

app.get('/example/api/portal/users/customers', function(req, res) {
  var list = [];
  for (var name in customers) {
    if (!customers.hasOwnProperty(name)) continue;
    var item = customers[name];
    list.push({
      id: item.id,
      name: item.name
    });
  }
  res.json(list).end();
});

app.put('/example/api/portal/users/customers', function(req, res) {
  var data = req.body;
  if (data && data.name) {
    data.id = String(++lastId);
    customers[data.id] = data;
    res.json({
      success: true,
      id: data.id
    }).end();
  } else {
    res.status(400).json({success: false}).end();
  }
});

app.route('/example/api/portal/users/customers/:id')
  .get(function(req, res) {
    var id = req.params.id;
    if (customers.hasOwnProperty(id)) {
      res.json(customers[id]).end();
    } else {
      res.status(400).json({success: false}).end();
    }
  })
  .post(function(req, res) {
    var id = req.params.id;
    var data = req.body;
    if (customers.hasOwnProperty(id) && data && data.name && data.id === id) {
      customers[id] = data;
      res.json({success: true}).end();
    } else {
      res.status(400).json({success: false}).end();
    }
  })
  .delete(function(req, res) {
    var id = req.params.id;
    if (customers.hasOwnProperty(id)) {
      delete customers[id];
      res.json({success: true}).end();
    } else {
      res.status(400).json({success: false}).end();
    }
  })
  .put(function(req, res) {
    res.status(400).json({success: false}).end();
  });

app.use(express.static('.'));

app.listen(8081, function() {
  console.log('Server started...');
});
