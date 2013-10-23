// An example Parse.js Backbone application based on the todo app by
// [Jérôme Gravel-Niquet](http://jgn.me/). This demo uses Parse to persist
// the todo items and provide user authentication and sessions.

$(function() {

  Parse.$ = jQuery;

  // Initialize Parse with your Parse application javascript keys
  Parse.initialize("dU6YxEUql5InydFFDwVpsjVhCytHNUqd56WXUqJb",
                   "4mbKMWjobTzWXBjJa2jIo7nm4nU42ZxuP1lRIuBn");

  // Feed Model
  // ----------

  // Our basic Feed model.
  var Feed = Parse.Object.extend("Feed", {
    // Default attributes for the Feed.
    defaults: {
      name: "Slim feed",
      url: "http://example.com/rss/stuff_i_like.xml",
      title_filter: ""
    },

    // Ensure that each todo created has `content`.
    initialize: function() {
      //if (!this.get("title_filter")) {
      //  this.set({"title_filter": this.defaults.title_filter});
      //}
    },

    // Toggle the `done` state of this todo item.
    toggle: function() {
      //this.save({done: !this.get("done")});
    }
  });

  // This is the transient application state, not persisted on Parse
  var AppState = Parse.Object.extend("AppState", {
    defaults: {
      filter: "all"
    }
  });

  // Feed Collection
  // ---------------

  var FeedList = Parse.Collection.extend({

    // Reference to this collection's model.
    model: Feed,

    // Filter down the list of all todo items that are finished.
    done: function() {
//      return this.filter(function(todo){ return todo.get('done'); });
      return true;
    },

    // Filter down the list to only todo items that are still not finished.
//    remaining: function() {
//      return this.without.apply(this, this.done());
////    },

    // We keep the Todos in sequential order, despite being saved by unordered
    // GUID in the database. This generates the next order number for new items.
//    nextOrder: function() {
//      if (!this.length) return 1;
//      return this.last().get('order') + 1;
//    },

    // Todos are sorted by their original insertion order.
//    comparator: function(todo) {
//      return todo.get('order');
//    }

  });

  // Feed Item View
  // --------------

  // The DOM element for a feed item...
  var FeedView = Parse.View.extend({

    //... is a list tag.
    tagName:  "li",

    // Cache the template function for a single item.
    template: _.template($('#item-template').html()),

    // The DOM events specific to an item.
    events: {
      "dblclick .view"      : "showDetails",
//      "dblclick label.feed-url" : "edit_url",
      "click #feed-destroy" : "clear",
      "click #feed-edit"    : "edit",
      "click #feed-copy"    : "copyLink",
      "keypress .edit"      : "updateOnEnter",
      "blur .edit"          : "save"
    },

    // The TodoView listens for changes to its model, re-rendering. Since there's
    // a one-to-one correspondence between a Todo and a TodoView in this
    // app, we set a direct reference on the model for convenience.
    initialize: function() {
      _.bindAll(this, 'render', 'remove');
      this.model.bind('change', this.render);
      this.model.bind('destroy', this.remove);
    },

    // Re-render the contents of the feed item.
    render: function() {
      $(this.el).html(this.template(this.model.toJSON()));
      return this;
    },

    collapseAll: function() {
      $(".inspecting").removeClass("inspecting");
      $(".editing").removeClass("editing");
    },

    // Show details
    showDetails: function() {
      this.collapseAll();
      $(this.el).addClass("inspecting");
    },

    // Copy the link for this filtered feed
    copyLink: function() {
      console.log("COPY");
      this.collapseAll();
      alert("Please copy this link for your filtered RSS feed:\n\n" + this.model.url());
    },

    // Switch this view into `"editing"` mode, displaying the input field.
    edit: function() {
      this.collapseAll();
      $(this.el).addClass("editing");
    },

    // Close the `"editing"` mode, saving changes to the feed.
    save: function() {
      console.log("save called");

      var name = this.$("#edit-name");
      var url = this.$("#edit-url");
      var title_filter = this.$("#edit-title_filter");
      this.model.save({
        name: name.val(),
        url: url.val(),
        title_filter: title_filter.val()
      });
    },

    // If you hit `enter`, we're through editing the item.
    updateOnEnter: function(e) {
      if (e.keyCode == 13) this.save();
    },

    // Remove the item, destroy the model.
    clear: function() {
      this.model.destroy();
    }

  });

  // The Application
  // ---------------

  // The main view that lets a user manage their todo items
  var ManageTodosView = Parse.View.extend({

    // Our template for the line of statistics at the bottom of the app.
    statsTemplate: _.template($('#stats-template').html()),

    // Delegated events for creating new items, and clearing completed ones.
    events: {
      "keypress #new-todo":  "createOnEnter",
      "click #clear-completed": "clearCompleted",
      "click #toggle-all": "toggleAllComplete",
      "click .log-out": "logOut",
      "click ul#filters a": "selectFilter"
    },

    el: ".content",

    // At initialization we bind to the relevant events on the `Todos`
    // collection, when items are added or changed. Kick things off by
    // loading any preexisting todos that might be saved to Parse.
    initialize: function() {
      var self = this;

      _.bindAll(this, 'addOne', 'addAll', 'addSome', 'render', 'toggleAllComplete', 'logOut', 'createOnEnter');

      // Main todo management template
      this.$el.html(_.template($("#manage-todos-template").html()));
      
      this.input = this.$("#new-todo");
      this.allCheckbox = this.$("#toggle-all")[0];

      // Create our collection of Todos
      this.todos = new FeedList;

      // Setup the query for the collection to look for todos from the current user
      this.todos.query = new Parse.Query(Feed);
      this.todos.query.equalTo("user", Parse.User.current());
        
      this.todos.bind('add',     this.addOne);
      this.todos.bind('reset',   this.addAll);
      this.todos.bind('all',     this.render);

      // Fetch all the feed items for this user
      this.todos.fetch();

      state.on("change", this.filter, this);
    },

    // Logs out the user and shows the login view
    logOut: function(e) {
      Parse.User.logOut();
      new LogInView();
      this.undelegateEvents();
      delete this;
    },

    // Re-rendering the App just means refreshing the statistics -- the rest
    // of the app doesn't change.
    render: function() {
      var done = 0; //this.todos.done().length;
      var remaining = 0; //this.todos.remaining().length;

      this.$('#todo-stats').html(this.statsTemplate({
        total:      this.todos.length,
        done:       this.todos.length,
        remaining:  this.todos.length
      }));

      this.delegateEvents();

      this.allCheckbox.checked = !remaining;
    },

    // Filters the list based on which type of filter is selected
    selectFilter: function(e) {
      var el = $(e.target);
      var filterValue = el.attr("id");
      state.set({filter: filterValue});
      Parse.history.navigate(filterValue);
    },

    filter: function() {
      var filterValue = state.get("filter");
      this.$("ul#filters a").removeClass("selected");
      this.$("ul#filters a#" + filterValue).addClass("selected");
      if (filterValue === "all") {
        this.addAll();
      } else if (filterValue === "completed") {
        this.addSome(function(item) { return item.get('done') });
      } else {
        this.addSome(function(item) { return !item.get('done') });
      }
    },

    // Resets the filters to display all todos
    resetFilters: function() {
      this.$("ul#filters a").removeClass("selected");
      this.$("ul#filters a#all").addClass("selected");
      this.addAll();
    },

    // Add a single todo item to the list by creating a view for it, and
    // appending its element to the `<ul>`.
    addOne: function(todo) {
      var view = new FeedView({model: todo});
      this.$("#todo-list").append(view.render().el);
    },

    // Add all items in the Todos collection at once.
    addAll: function(collection, filter) {
      this.$("#todo-list").html("");
      this.todos.each(this.addOne);
    },

    // Only adds some todos, based on a filtering function that is passed in
    addSome: function(filter) {
      var self = this;
      this.$("#todo-list").html("");
      this.todos.chain().filter(filter).each(function(item) { self.addOne(item) });
    },

    // If you hit return in the main input field, create new Todo model
    createOnEnter: function(e) {
      var self = this;
      if (e.keyCode != 13) return;

      this.todos.create({
        name: this.input.val(),
        url:  "test",
        user: Parse.User.current(),
        ACL:  new Parse.ACL(Parse.User.current())
      });

      this.input.val('');
      this.resetFilters();
    },

    // Clear all done todo items, destroying their models.
    clearCompleted: function() {
      //_.each(this.todos.done(), function(todo){ todo.destroy(); });
      return false;
    },

    toggleAllComplete: function () {
      var done = this.allCheckbox.checked;
      this.todos.each(function (todo) { todo.save({'done': done}); });
    }
  });

  var LogInView = Parse.View.extend({
    events: {
      "submit form.login-form": "logIn",
      "click form.login-form #forgot-password": "forgotPassword",
      "submit form.signup-form": "signUp"
    },

    el: ".content",
    
    initialize: function() {
      _.bindAll(this, "logIn", "signUp");
      this.render();
    },

    forgotPassword: function(e) {
      var self = this;
      var username = this.$("#login-username").val();

      if (!username || username.length == 0) {
        self.$(".login-form .error").html("Please enter an email.").show();
        return false;
      }

      Parse.User.requestPasswordReset(username, {
        success: function() {
          self.$(".login-form .error").hide();
          alert("Sent password reset instructions to " + username);
        },
        error: function(error) {
          self.$(".login-form .error").html("Error: " + error.message).show();
        }
      });
    },

    logIn: function(e) {
      var self = this;
      var username = this.$("#login-username").val();
      var password = this.$("#login-password").val();

      if (!username || username.length == 0) {
        self.$(".login-form .error").html("Please enter an email.").show();
        return false;
      }
      if (password.length == 0) {
        self.$(".login-form .error").html("Please enter a password.").show();
        return false;
      }
      
      this.$(".login-form button").attr("disabled", "disabled");
      Parse.User.logIn(username, password, {
        success: function(user) {
          new ManageTodosView();
          self.undelegateEvents();
          delete self;
        },

        error: function(user, error) {
          self.$(".login-form .error").html("Invalid email or password. Please try again.").show();
          this.$(".login-form button").removeAttr("disabled");
        }
      });

      return false;
    },

    signUp: function(e) {
      var self = this;
      var username = this.$("#signup-username").val();
      var password = this.$("#signup-password").val();

      if (!username || username.length == 0) {
        self.$(".signup-form .error").html("Please enter an email.").show();
        return false;
      }
      if (password.length == 0) {
        self.$(".signup-form .error").html("Please enter a password.").show();
        return false;
      }

      var user = new Parse.User();
      user.set("username", username);
      user.set("email", username);
      user.set("password", password);
      
      user.signUp({ ACL: new Parse.ACL() }, {
        success: function(user) {
          new ManageTodosView();
          self.undelegateEvents();
          delete self;
        },

        error: function(user, error) {
          self.$(".signup-form .error").html(error.message).show();
          this.$(".signup-form button").removeAttr("disabled");
        }
      });

      this.$(".signup-form button").attr("disabled", "disabled");

      return false;
    },

    render: function() {
      this.$el.html(_.template($("#login-template").html()));
      this.delegateEvents();
    }
  });

  // The main view for the app
  var AppView = Parse.View.extend({
    // Instead of generating a new element, bind to the existing skeleton of
    // the App already present in the HTML.
    el: $("#todoapp"),

    initialize: function() {
      this.render();
    },

    render: function() {
      if (Parse.User.current()) {
        new ManageTodosView();
      } else {
        new LogInView();
      }
    }
  });

  var AppRouter = Parse.Router.extend({
    routes: {
      "all": "all",
      "active": "active",
      "completed": "completed"
    },

    initialize: function(options) {
    },

    all: function() {
      state.set({ filter: "all" });
    },

    active: function() {
      state.set({ filter: "active" });
    },

    completed: function() {
      state.set({ filter: "completed" });
    }
  });

  var state = new AppState;

  new AppRouter;
  new AppView;
  Parse.history.start();
});
