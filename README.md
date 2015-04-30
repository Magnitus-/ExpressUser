Express-User
============

Module to expose user management (registration, account deletion, login, logout, etc) in a ressource-oriented way.

Overall Architecture
====================

The express-user relies on the following architecture:

Validator: performs access-control and input-validation. See express-user-local for a flexible implementation of traditional local authentication.
Store: Interacts with the user store. This is this project.
Responder: handles responding to the client and custom tasks (ie, sending emails, etc) before responding. See express-user-local-basic for a barebone implementation using local authentication.

These 3 components communication with each other using predefined express routes and by accessing and manipulating the response.locals.ExpressUser object.

Routes
======

1) Universal URLs:
- POST /Users -> Account creation
- PATCH /User/Self -> Account modification (using session to identify the account)
- DELETE /User/Self -> Account deletion (using session to identify the account)
- GET /User/Self -> Fetching account info (using session to identify the account)
- PUT /Session/Self/User -> Login
- DELETE /Session/Self/User -> Logout
- GET /Users/:Field/:ID/Count -> Fetching the count of users with the given value for the given field
- PUT /User/Self/Memberships/:Membership -> Adds Membership to the list of an account's memberships (using session to identify the account)
- DELETE /User/Self/Memberships/:Membership -> Remove Membership to the list of an account's memberships (using session to identify the account)
- POST /User/Self/Recovery/:SetField -> Internally behaves like PATCH /User/Self, but gives validator a recognisable route to perform recovery behavior and validation (including access control) on the 'SetField' field.
- POST /User/:Field/:ID/Recovery/:SetField -> Internally behaves like PATCH /User/:Field/:ID (minus the admin access restriction), but gives validator a recognisable route to perform recovery behavior and validation (including access control) on the 'SetField' field.

2) Admin URLs:
- PATCH /User/:Field/:ID -> Account modification (using the ID of the given Field to identify the account)
- DELETE /User/:Field/:ID -> Account deletion (using the ID of the given Field to identify the account)
- GET /User/:Field/:ID -> Fetching account info (using the ID of the given Field to identify the account)
- PUT /User/:Field/:ID/Memberships/:Membership -> Adds Membership to the list of an account's memberships (using the ID of the given Field to identify the account)
- DELETE /User/:Field/:ID/Memberships/:Membership -> Remove Membership to the list of an account's memberships (using the ID of the given Field to identify the account)

Note: Admin URLs is a suggestion here of URLs that I think should be restricted to superusers. To increase flexibility and provide a clearer separation of concerns among components, the enforcement of that restriction is delegated to the validator.

Usage
=====

Constructor
-----------

The module acts as its constructor.

It returns a router which can be passed as an argument to Express' app.use method.

It's signature is: 

```javascript
function(<UserStore>, <Options>);
```

The 'UserStore' argument is a user store that is either the user-store library or another that has the same external API.

'Options' is an object containing 2 properties:

- 'Validator'

The validator that performs the following for enabled routes: access control, input checks and sets the correct properties on the res.locals.ExpressUser object that allows express-user to do its work.

- 'Responder'

The responder that returns a response to the client (both status code and body) based on whether or not express-user or the validator threw an error route and what properties they defined on the res.locals.ExpressUser object.

Session Route
-------------

This method of the express-user module returns a route that can be passed to Express' app.use method.

It's function is to keep a user's session synchronized with his/her profile.

It's signature is:

```javascript
ExpressUser.SessionRoute(<UserStore>, <UniqueProperty>)
```

The 'UserStore' argument is a user store that is either the user-store library or another that has the same external API.

The 'UniqueProperty' argument is a string that is the name of a field that is present for all users and unique to each user.

Example
-------
For a full implementation with local authentication and MongoDB for storage, see the example in the express-user-local project. 

```javascript
var Express = require('express');
var Http = require('http');
var ExpressUser = require('express-user');
var BodyParser = require('body-parser'); //express-user doesn't require it, but your validator probably will
var Session = require('express-session');

...
//Initialize Validator, Responder and UserStore
...

var App = Express();

//You'll need to initialize your session store if you want sessions to be stored permanently
App.use(Session({
    'secret': 'qwerty!',
    'resave': true,
    'saveUninitialized': true,
    'store': SessionStore
}));

//In this example, the client would send the request bodies to the library's routes in JSON format
App.use(BodyParser.json());

//Initialize all the routes in proper order
var UserRouter = ExpressUser(UserStore, {'Validator': Validator, 'Responder': Responder});

//Route to ensure that a user's session will always be in sync with his info. It should be assigned to every path where a user's session is required. '/' is a good general default.
//Here, '_id' is assumed unique field that is present for each user. This is the default ID field in MongoDB collections, but you'll probably want to change it if you use another database or your own custom ID field.
App.use(ExpressUser.SessionRoute(UserStore, '_id'));

//Assign all the routes described above to the '/' base route. Alternatively, you could decide to assign to another base route like '/ExpressUser'. 
App.use(UserRouter);

//And... the rest should be business as usual :)

```

API With Other Components
=========================

Expected method
---------------

Both the Validator and the Responder that are passed to the express-user constructor are expected to be callable (ie, functions) and take a router (on which express-user defines its own routes) as their sole argument.

From there, they can attach their own routes to interact with express-user and each other.

The convention is that express-user calls the validator which sets its routes first. Then, express-user sets its own routes and finally, it calls the responder which sets its routes last.

Intercomponent Communication: Input
-----------------------------------

express-user doesn't take any input from a request's body, from URL parameters or from the session. That's a validator's job. Rather, express-user take its input from the res.locals.ExpressUser object, which should be properly set by the validator.

The reason of this architecture is twofold: Make express-user more generic with a clear separate of concerns from the validator and make express-user more secure by blocking routes that haven't been processed by the validator, thus making it the default that anything you haven't defined in your validator is blocked.

Below are the input expectations from various routes:

- POST /Users

res.locals.ExpressUser.User: should contain the fields of the new user

- PATCH /User/Self and PATCH /User/:Field/:ID

res.locals.ExpressUser.User: should contain the fields identifying the user to modify

res.locals.ExpressUser.Update: Should contain the new values of fields that are to be modified

- DELETE /User/Self and DELETE /User/:Field/:ID

res.locals.ExpressUser.User: Should contain the fields identifying the user to delete

- GET /User/Self and GET /User/:Field/:ID

res.locals.ExpressUser.User: Should contain the fields identifying the user to get

- PUT /Session/Self/User

res.locals.ExpressUser.User: Should contain the fields identifying the user to store in the session

- DELETE /Session/Self/User

No input required beyond the res.locals.ExpressUser object existing. Will just delete the req.session.User, if present.

- GET /Users/:Field/:ID/Count

res.locals.ExpressUser.User: Should contain the fields that define the users you wish to count

- PUT /User/Self/Memberships/:Membership and PUT /User/:Field/:ID/Memberships/:Membership

res.locals.ExpressUser.User: should contain the fields identifying the user to modify

res.locals.ExpressUser.Membership: the membership you wish to add

- DELETE /User/Self/Memberships/:Membership and DELETE /User/:Field/:ID/Memberships/:Membership

res.locals.ExpressUser.User: should contain the fields identifying the user to modify

res.locals.ExpressUser.Membership: the membership you wish to remove

- POST /User/Self/Recovery/:SetField and POST /User/:Field/:ID/Recovery/:SetField

res.locals.ExpressUser.User: should contain the fields identifying the user to modify

res.locals.ExpressUser.Update: Should contain the new values of fields that are to be modified
 
Intercomponent Communication: Output
------------------------------------

express-user doesn't respond to requests directly. Rather, it interacts with the responder by setting properties on the res.locals.ExpressUser object and by triggering error routes (ie, calling next(err)).

Below are outputs for various routes:

- All routes

If res.locals.ExpressUser is not defined by the validator, an error route will be triggered with Err.Source having the value of 'ExpressUser' and Err.Type having the value of 'NotValidated'.

If user-store returns an error that isn't a constraint error, an error route will be triggered and the error will be passed to it.

- POST /Users

If a constraint error is encountered (ie, unique or null constraint violated), an error route will be triggered with Err.Source having the value of 'UserStore' and Err.Type having the value of 'StoreConstraint'.

If no error was encountered while manipulating the store, but the user was not inserted, an error route will be triggered with Err.Source having the value of 'ExpressUser' and Err.Type having the value of 'NoInsertion'.

Otherwise, no properties are set.

- PATCH /User/Self and PATCH /User/:Field/:ID

If a constraint error is encountered (ie, unique or null constraint violated), an error route will be triggered with Err.Source having the value of 'UserStore' and Err.Type having the value of 'StoreConstraint'.

If no error was encountered while manipulating the store, but the user was not inserted, an error route will be triggered with Err.Source having the value of 'ExpressUser' and Err.Type having the value of 'NoUpdate'.

Otherwise, no properties are set.

- DELETE /User/Self and DELETE /User/:Field/:ID

If no error was encountered while manipulatinbg the store, but no user was found to update, an error route will be triggered with Err.Source having the value of 'ExpressUser' and Err.Type having the value of 'NoDelete'.

Otherwise, no properties are set.

- GET /User/Self and GET /User/:Field/:ID

If no error was encountered while manipulating the store, but the user was not found, an error route will be triggered with Err.Source having the value of 'ExpressUser' and Err.Type having the value of 'NoUser'.

Otherwise, the retrieved user (object with the user's properties as its properties) is stored in the property res.locals.ExpressUser.Result.

- GET /Users/:Field/:ID/Count

The count of users satisfying the selection (numerical primitive) is stored in the property res.locals.ExpressUser.Result.

- PUT /User/Self/Memberships/:Membership and PUT /User/:Field/:ID/Memberships/:Membership

If no error was encountered while manipulating the store, but the user to insert the membership to was not found, an error route will be triggered with Err.Source having the value of 'ExpressUser' and Err.Type having the value of 'NoInsertion'.

Otherwise, no propertie are set.

Currently, express-user doesn't provide feedback to indicate that a membership insertion did nothing due to the membership already being present.

- DELETE /User/Self/Memberships/:Membership and DELETE /User/:Field/:ID/Memberships/:Membership

If no error was encountered while manipulating the store, but the user to remove the membership from was not found, an error route will be triggered with Err.Source having the value of 'ExpressUser' and Err.Type having the value of 'NoDeletion'.

Otherwise, no propertie are set.

Currently, express-user doesn't provide feedback to indicate that a membership removal did nothing due to the membership already being absent.

- POST /User/Self/Recovery/:SetField and POST /User/:Field/:ID/Recovery/:SetField

Same as PATCH /User/Self and PATCH /User/:Field/:ID

- PUT /Session/Self/User

If no error was encountered while manipulating the store, but the user to insert into the session was not found, an error route will be triggered with Err.Source having the value of 'ExpressUser' and Err.Type having the value of 'NoUser'.

Otherwise, no propertie are set.

- DELETE /Session/Self/User

If the req.session.User is a falsey value, an error route will be triggered with Err.Source having the value of 'ExpressUser' and Err.Type having the value of 'NoSessionUser'.

Otherwise, no propertie are set.

- Further Note 

Whatever is passed to express-user by the validator is also passed to the responder and if an error is encountered by the validator, it can bypass express-user entirely and go straight to the responder by triggering an error route.

Dependencies
============

- A recent version of Node.js (version 0.10.25 is installed on my machine) [1]

- A recent version of Express.js (version 4.x, the library uses Express.Router()) [1]

- Either the user-store project (and accompanying dependencies) or a user store that has the same API as the user-store project 

- For an "out of the box" solution, you'll also need a validator and a responder. express-user-local and express-user-local-basic can provide those for you for local authentication.

- The library uses the PUT, DELETE and PATCH HTTP methods, which are traditionally not supported in submitted HTML forms. If you use those, you'll need to use a library like method-override.

[1] If it doesn't work for later version, please let me know.

Session Dependency
------------------

The library provides optional session support in 3 ways:

- Session route to synchronize a user's profile with the user information in his session
- A PUT /Session/Self/User for session-based login
- A DELETE /Session/Self/User for session-based logout

For session support to work, you need either the express-session library or another that behaves in the following manner: req.session is defined and manipulating it results in persistent session changes.

Note that the remainder of this library is not dependent on your using its session support so you opt not to use it and still use the rest of the library. You simply need not to handle the session routes in your validator and express-user will trigger an error handler when those routes are encountered, which you can deal with in your validator (and maybe return 404).

Security Note About Validator
=============================

At the database level, user-store provides some optional error-checking for user insertion (uniqueness, not null, hashing of password if present).

Otherwise, the user-store I implemented is using MongoDB which is schema free and I took full advantage of this fact to make my implementation of user-store unbiased.

Similarly, express-user, which provides Express routing on top of user-store and a user's session, is very flexible and has little bias.

This means that the vast majority of the bias concerning what your user fields should look like, what input various actions expect and access control on routes fall on the validator.

As such, it should ensure that all the fields you expect for various actions (ex: password, email token, etc) are there and that their values follow whichever constraints you wish to place upon them.

You should be as conservative as your application domains allows concerning what you'll accept.

Also, in most applications, you'll want to:

- Restrict what fields a user can define with the POST /Users route
- Restrict what fields a user can set with the PATCH /User/Self route
- Restrict what fields a user can see with the GET /User/Self route
- Restrict what memberships a user can add with the PUT /User/Self/Memberships/:Membership route
- Restrict what memberships a user can remove with the DELETE /User/Self/Memberships/:Membership route
- Make the Admin routes accessible only to superusers
- restrict what fields a user can reset with the POST /User/:Field/:ID/Recovery/:SetField and POST /Self/:ID/Recovery/:SetField routes
- restrict what fields a user can count with the GET /Users/:Field/:ID/Count

For local authentication, the express-user-local project take all these things into consideration.

Also, any route that the validator doesn't handle will return a 'NoValidation' error by default (which can be caught by the responder), so you can simply forgo implementing the routes that you don't plan on using in the validator (but you still need to catch the error and return something like 404).

Session Synchronization
=======================

For those using session functionality provided by express-user:

For a smooth seemless functionality to users, sessions and user accounts they point to need to be in sync, such that when accounts are updated or deleted, this is reflected in sessions pointing to it.

The implemented solution right now is the ExpressUser.SessionRoute route, which should be placed after session initialization, but before any logic that uses sessions.

It returns a route, taking as arguments the user store and a string representing a constant field that will never change for a particular user (_id works if the database is MongoDB).

I didn't integrate this in the main express-user route so that you can place user/session synchronization on any path that uses sessions without being required to do same for the main express-user route.

For example, you might decide to set the base path of express-user's main route to /ExpressUser, but you should probably put session synchronization on /.

Future Optimisation
-------------------

In the longer term, I'm considering implementing a read-only capability for express-session-mongodb which will allow us to implement the insurance that user info is never re-saved with the remainder of the session.

From there, sessions will be updated directly when users are updated/deleted (without fear of those changes being overwritted by session re-saves).

The advantages of this implementation would be to save a trip to the user store to read the user info for each request, at the cost of making profile updates and deletions more expensive operations (which would be ok since they are a lot rarer).

The disadvantages would be a greater dependency to my session-store (since other implementations are extremely unlikely to implement something like this with the same API) and sessions getting out-of-sync anyways in the case of a failure after the user is updated, but before sessions can be updated (since MongoDB is transaction free for complex operations of this nature)

For the above reasons, when I get around to implementing this, it will be an optional feature.

Given that this would be an optimisation rather than a requirement for functionality, I'll probably finish functionality before I get around to implementing this.

Example
=======

See the example in the express-user-local project for a working example using local authentication.

Versions History
================

1.0.3
-----

Documentation improvements: Corrected incorrect information for counting error and clarified session dependencies.

1.0.2
-----
- Added user-properties to dev dependencies
- Updated user-store dev dependency to version 2.0.0 and adjusted tests accordingly
- Finished doc

1.0.1
-----

- Added check to make sure DELETE /Session/Self/User goes through the validator
- Finished tests
- Corrected errors in documentation and added more to it.

1.0.0
-----

- Moved access control on admin URLs to validator and removed Express-Access-Control as a dependency
- Moved connection security verification to validator
- Moved Roles constructor option to Validator
- Added support for constraint errors on PATCH routes
- Added dev dependencies to run unit tests
- Started tests
- Started final version of documentation
- Updated dev dependency of user-store to version 1.3.0

0.0.1-alpha.15
--------------

- Changed POST /User/Self/:SetField and POST /User/:Field/:ID/:SetField routes to more semantically meaningful POST /User/Self/Recovery/:SetField and POST /User/:Field/:ID/Recovery/:SetField

0.0.1-alpha.14
--------------

- Added support for POST /User/Self/:SetField and POST /User/:Field/:ID/:SetField routes
- Added support for Responder.
- Replaced response logic by feedback to pass to Responder.
- Removed GetSerializer and CountSerialized constructor options. Moved them to Responder.

0.0.1-alpha.13
--------------

- Moved the responsability to manage which fields are hidden for 'GET' requests to the validator.

0.0.1-alpha.12
--------------

- Added support for membership manipulation routes

0.0.1-alpha.11
--------------

- Moved example to express-user-local project
- Removed dev dependencies tied to the example

0.0.1-alpha.10
--------------

- Updated dev dependency of express-user-local to 0.0.1-alpha.7.
- Modified example (client and server) to include csrf mitigation.

0.0.1-alpha.9
-------------

- Updated dev dependency of express-user-local to 0.0.1-alpha.5.
- Updated the client-side of the example to changes made to express-user-local.

0.0.1-alpha.8
-------------

- Updated dev dependency of express-user-local to 0.0.1-alpha.4.
- Added express-brute and express-brute-mongo to the dev dependencies
- Augmented the example with brute-force mitigation

0.0.1-alpha.7
-------------

- Fixed doc error
- Added '/Users/:Field/:ID/Count/' consideration for validator security section of the doc.

0.0.1-alpha.6
-------------

- Added support for the /Users/:Field/:ID/Count/ route.
- Used the above to augment the example with an automated check to tell you if a Username is taken during registration.
- Updated dev dependency of express-user-local to version 0.0.1-alpha.3
- Updated dev dependency of mongodb to version 1.4.30
- Did a bit of refactoring.
- Fixed a bug that would cause the HidePassword option to be ignored when fetching user info.

0.0.1-alpha.5
-------------

- Moved access control logic into a separate module.
- Changed the validator API a bit so that the validator can access Roles.
- Updated user-store dependency to version 1.2.0.
- Updated dev dependency of express-user-local to 0.0.1-alpha.2

0.0.1-alpha.4
-------------

Added session sychronization support

0.0.1-alpha.3
-------------

- Updated dev dependencies for user-store to version 1.1.1

- Modified bad input handling to take into account the more detailed constraint errors of user-store and return 400 rather than a 500 system error for submissions that violate constraints.

0.0.1-alpha.2
-------------

Update dev dependencies for express-user-local to version 0.0.1-alpha1

0.0.1-alpha.1
-------------

Doc formating fix.

Changed session management URL from /Session/User to /Session/Self/User

0.0.0 
-----

Initial prototype
