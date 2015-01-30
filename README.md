Express-User
============

Module to expose user management (registration, account deletion, login, logout, etc) in a ressource-oriented way.

Status
======

The library is in prototype stage at this point. It is untested (beyond basic manual tests) and I'll postpone the writing of automated tests until the API is relatively final.

The API is very likely to change due to:

- My eventual desire to decouple the response logic (return codes and content + logging) from the rest of the library in order to allow for specialized response plugins (ex: HTML forms, single-page clients with Ajax, collection+JSON hypermedia, etc)

- While I do not foresee that many architectural changes for this, I do not rule them out entirely as I integrate the following features in my web applications: ajax feedback on forms (ex: immediate feedback if username is taken during registration), email verification, csrf tokens, brute force mitigation for login, etc. 

- I want to implement session consistency (for logged in users) with user profile modifications (for updates and deletions)

Known Bug(s)
============

When setting an unique index on user fields, duplicate field insertions (ie, creating a second user with the same username) gets treated as a system error.

This will require that I modify the user-store project (and expected API) to handle duplicate insert error as an input error, not a database one.

URL Map
=======

1) Universal URLs:
- POST /Users -> Account creation
- PATCH /User/Self -> Account modification (using session to identify the account)
- DELETE /User/Self -> Account deletion (using session to identify the account)
- GET /User/Self -> Fetching account info (using session to identify the account)
- PUT /Session/Self/User -> Login
- DELETE /Session/Self/User -> Logout

2) Admin URLs:
- PATCH /User/:Field/:ID -> Account modification (using the ID of the given Field to identify the account)
- DELETE /User/:Field/:ID -> Account deletion (using the ID of the given Field to identify the account)
- GET /User/:Field/:ID -> Fetching account info (using the ID of the given Field to identify the account)

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

The dev-dependencies contains a complete stack for an out-of-the-box solution, minus the method handling of html forms.

Example
=======

While keeping in mind that details will probably change in the future, you can play with what is currently there, by running the Example.js server (you'll need the dev dependencies to run it) and going to the following adress in your browser: http://127.0.0.1:8080/

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
