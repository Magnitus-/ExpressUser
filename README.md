Express-User
============

Module to expose user management (registration, account deletion, login, logout, etc) in a ressource-oriented way.

Status
======

The library is in prototype stage at this point. It is untested (beyond basic manual tests) and I'll postpone the writing of automated tests until the API is relatively final.

The API is very likely to change due to:

- My eventual desire to decouple the response logic (return codes and content + logging) from the rest of the library in order to allow for specialized response plugins (ex: HTML forms, single-page clients with Ajax, collection+JSON hypermedia, etc)

- While I do not foresee that many architectural changes for this, I do not rule them out entirely as I integrate the following features in my web applications:  email verification.

Known Bug(s)
============

...

URL Map
=======

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

2) Admin URLs:
- PATCH /User/:Field/:ID -> Account modification (using the ID of the given Field to identify the account)
- DELETE /User/:Field/:ID -> Account deletion (using the ID of the given Field to identify the account)
- GET /User/:Field/:ID -> Fetching account info (using the ID of the given Field to identify the account)
- PUT /User/:Field/:ID/Memberships/:Membership -> Adds Membership to the list of an account's memberships (using the ID of the given Field to identify the account)
- DELETE /User/:Field/:ID/Memberships/:Membership -> Remove Membership to the list of an account's memberships (using the ID of the given Field to identify the account)

Architecture
============

Express-User relies on 2 components (eventually at least 3):

- express-user itself that does the following: 

-secure connection checking (HTTPS or local)

-Access control: privilege check to ensure the admin URLs are accessed by an admin and that the user is logged in when accessing the Self URLs

-Handle accout manipulation

-Provide a routing callback for authentication (to check the user is either logged in or belongs to a given group)

- A validator (currently, the express-user-local npm repo implements validation for an email/username/password scheme)

This component implements validation to check that requests contain all the expected information and in the right format.

From there, it constructs the req.locals.ExpressUser.User (usually expected by express-user) and the req.locals.ExpressUser.Update (sometimes expected by Express-User) as needed.

It shouldn't handle traditional database validations (ie, does the username already exist) which should handled by a properly configured user-store.

Express-User passes an Express router to the validator which allows it establish validation routes.

The entire achitecture relies heavily on Express routes to establish ordering of logic and communication between components.

Security Note About Validator
=============================

At the database level, user-store provides some optional error-checking for user insertion (uniqueness, not null, hashing of password if present).

Otherwise, the user-store I implemented is using MongoDB which is schema free and I took full advantage of this fact to make my implementation of user-store unbiased.

Similarly, express-user, which provides Express routing and some access control on top of user-store and a user's session, is very flexible and has little bias.

This means that the vast majority of the bias concerning what your user fields should look like and what input various actions expect falls on the validator.

As such, it should ensure that all the fields you expect for various actions (ex: password) are there and that their values follow whichever constraints you wish to place upon them.

You should be as conservative as your application domains allows concerning what you'll accept.

Also, you validator should ensure that for the route /Users/:Field/:ID/Count/, only publicly available information should be selectable for regular users (see express-user-local code for an implementation of this).

Finally, the validator should be very selective about what values of Membership it allows for the /User/Self/Memberships/:Membership routes.

Session Synchronization
=======================

For a smooth seemless functionality to users, sessions and user accounts they point to need to be in sync, such that when accounts are updated or deleted, this is reflected in sessions pointing to it.

The only implemented solution ais the ExpressUser.SessionRoute route, which should be placed after session initialization, but before any logic that uses sessions.

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

Dependencies
============

- A recent version of Node.js (version 0.10.25 is installed on my machine) [1]

- A recent version of Express.js

- npm if you want the easy way to install this module.

[1] Later versions should also work. If you find it not to be the case, let me know.

Dependencies for out-of-box solution
====================================

- User store:

This library expects a user store that outwardly behaves just like the user-store project for the Add/Get/Remove/Update methods.

You can use user-store (which uses MongoDB), or implement your own user store solution (from scratch or by writing a wrapper around an existing solution to conform to the expected API).

- Session management:

Additionally, this library also expects a session management library that behaves like express-session as far as the req.session variable is concerned.

Again, you can use express-session to get a working solution out of the box or implement your own solution (either from scratch or by writing a wrapper around another existing solution such that req.session behaves as expected).

- Validator:

In order to remain flexible, this library leaves the implementation of request validation to you in terms of making sure that the right fields are submitted (plus any sanitation check)

Currently, the traditional email/username/password validation scheme is implemented in this project: express-user-local

- Request Body:

This library expects req.body to be populated with the variables in the body of your request. The body-parser project can do this for you.

- Methods:

If you are using HTML forms (which only support the GET and POST methods), you'll need a library like method-override to simulate other kinds of request methods (ie, PUT, PATCH, DELETE)

- For a shortcut:

The dev-dependencies in the express-user-local project contain a complete stack for an out-of-the-box solution, minus the method handling of html forms.

Example
=======

See express-user-local project for a working example using local authentication.

Future
======

More in-depth details to come once the API is finalized.

Versions History
================

0.0.0 
-----

Initial prototype

0.0.1-alpha.1
-------------

Doc formating fix.

Changed session management URL from /Session/User to /Session/Self/User

0.0.1-alpha.2
-------------

Update dev dependencies for express-user-local to version 0.0.1-alpha1

0.0.1-alpha.3
-------------

- Updated dev dependencies for user-store to version 1.1.1

- Modified bad input handling to take into account the more detailed constraint errors of user-store and return 400 rather than a 500 system error for submissions that violate constraints.

0.0.1-alpha.4
-------------

Added session sychronization support

0.0.1-alpha.5
-------------

- Moved access control logic into a separate module.
- Changed the validator API a bit so that the validator can access Roles.
- Updated user-store dependency to version 1.2.0.
- Updated dev dependency of express-user-local to 0.0.1-alpha.2

0.0.1-alpha.6
-------------

- Added support for the /Users/:Field/:ID/Count/ route.
- Used the above to augment the example with an automated check to tell you if a Username is taken during registration.
- Updated dev dependency of express-user-local to version 0.0.1-alpha.3
- Updated dev dependency of mongodb to version 1.4.30
- Did a bit of refactoring.
- Fixed a bug that would cause the HidePassword option to be ignored when fetching user info.

0.0.1-alpha.7
-------------

- Fixed doc error
- Added '/Users/:Field/:ID/Count/' consideration for validator security section of the doc.

0.0.1-alpha.8
-------------

- Updated dev dependency of express-user-local to 0.0.1-alpha.4.
- Added express-brute and express-brute-mongo to the dev dependencies
- Augmented the example with brute-force mitigation

0.0.1-alpha.9
-------------

- Updated dev dependency of express-user-local to 0.0.1-alpha.5.
- Updated the client-side of the example to changes made to express-user-local.

0.0.1-alpha.10
--------------

- Updated dev dependency of express-user-local to 0.0.1-alpha.7.
- Modified example (client and server) to include csrf mitigation.

0.0.1-alpha.11
--------------

- Moved example to express-user-local project
- Removed dev dependencies tied to the example

0.0.1-alpha.12
--------------

- Added support for membership manipulation routes

0.0.1-alpha.13
--------------

- Moved the responsability to manage which fields are hidden for 'GET' requests to the validator.
