/**
 * Created by Oleg Galaburda on 27.03.16.
 */
var api = RESTObject.create('/example/api');
var customers = api.portal.users.customers.preventDefault();
$(function() {
  reloadList();
  $('button.save').on('click', function(event) {
    event.preventDefault();
    var item = getFormData();
    item.id = $('form.edit').data('item').id;
    // POST /example/api/portal/users/customers/:id -- update customer info
    customers[item.id].update(item).then(function() {
      reloadList();
    });
  });
  $('button.add').on('click', function(event) {
    event.preventDefault();
    // PUT /example/api/portal/users/customers -- create new customer
    customers.create(getFormData()).then(
      reloadList,
      function() {
        alert('Error happened when adding new customer.');
      }
    );
  });
});
function reloadList() {
  $('.list tbody').empty();
  // GET /example/api/portal/users/customers -- get list of customers
  customers.read().then(
    displayList,
    function(xhr) {
      alert('Error happened while loading customers list.');
    }
  );
}
function displayList(list) {
  var $container = $('.list tbody');
  $container.empty();
  $.each(list, function(index, item) {
    var $el = $('<tr>\
                       <td>' + item.name + '</td>\
                       <td><a href="" class="delete">Delete</a></td>\
                     </tr>');
    $el.addClass('customer-' + item.id);
    $el.on('click', 'td', function() {
      editCustomer(item);
    });
    $el.on('click', 'a.delete', function(event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      deleteCustomer(item);
    });
    $el.data('item', item);
    $container.append($el);
  });
}
function displayForm(data) {
  $('#name').val(data.name);
  $('#company').val(data.company);
  $('#age').val(data.age);
  $('#phone').val(data.phone);
  $('#address').val(data.address);
  $('form.edit').data('item', data);
  $('button.save').removeClass('hidden');
}
function getFormData() {
  return {
    name: $('#name').val(),
    company: $('#company').val(),
    age: $('#age').val(),
    phone: $('#phone').val(),
    address: $('#address').val()
  };
}
function editCustomer(item) {
  // GET /example/api/portal/users/customers/:id -- get customer info
  customers[item.id].read().then(
    displayForm,
    function(xhr) {
      alert('Error happened while loading customer info.');
    }
  );
}
function deleteCustomer(item) {
  if (confirm('Delete customer?')) {
    // DELETE /example/api/portal/users/customers/:id
    customers[item.id].delete().then(function() {
      $('.list tr.customer-' + item.id).remove();
    });
  }
}
