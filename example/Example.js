//Copyright (c) 2015 Eric Vallee <eric_vallee2003@yahoo.ca>
//MIT License: https://raw.githubusercontent.com/Magnitus-/ExpressUser/master/License.txt

var Http = require('http');
var Express = require('express');
var Path = require('path');
var BodyParser = require('body-parser');

var MongoDB = require('mongodb');
var Session = require('express-session');
var SessionStoreAPI = require('express-session-mongodb');
var UserStoreAPI = require('user-store');
var ExpressUserLocal = require('express-user-local');

var ExpressUser = require('../lib/ExpressUser');

var App = Express();

var RandomIdentifier = 'ExpressUserExample'+Math.random().toString(36).slice(-8);

var SessionStoreOptions = {'TimeToLive': 300, 'IndexSessionID': true, 'DeleteFlags': true};
var StaticPath = Path.resolve(__dirname, 'Static');
var Index = Path.resolve(Path.resolve(__dirname, "Views"), "Index.html");

MongoDB.MongoClient.connect("mongodb://localhost:27017/"+RandomIdentifier, {native_parser:true}, function(Err, DB) {
    UserStoreAPI(DB, {'Email': {'Unique': 1, 'NotNull': 1}, 'Username': {'Unique': 1, 'NotNull': 1}, 'Password': {'NotNull': 1}}, function(Err, UserStore) {
        SessionStoreAPI(DB, function(Err, SessionStore) {
            
            App.use(Session({
                'secret': 'qwerty!',
                'resave': false,
                'saveUninitialized': true,
                'store': SessionStore
            }));
                           
            App.use('/Static', Express.static(StaticPath));
            App.use(BodyParser.json());
            
            var UserRouter = ExpressUser(UserStore, {'Validator': ExpressUserLocal()});
            App.use(UserRouter);
            
            //Obviously for testing purposes, never put this in a production environment without rock-solid access control
            App.post('/User/Self/Memberships/Admin', function(Req, Res, Next) {
                if(Req.session.User)
                {
                    UserStore.AddMembership({'Email': Req.session.User.Email}, 'Admin', function(Err, Result) {
                        if(Err)
                        {
                            Next(Err);
                        }
                        else
                        {
                            if(Result>0)
                            {
                                Res.status(200).end();
                            }
                            else
                            {
                                Res.status(400).end();
                            }
                        }
                    });
                }
                else
                {
                    Res.status(400).end();
                }
            });
            
            //Probably another questionable one to put in a production environment for regular users
            App.get('/Session/Self/User', function(Req, Res, Next) {
                if(Req.session.User)
                {
                    Res.json(Req.session.User);
                }
                else
                {
                    Res.status(400).end();
                }
            });
            
            App.get('/', function(Req,Res) {
                Res.sendFile(Index);
            });
            
            Http.createServer(App).listen(8080);
        }, SessionStoreOptions);
    });
});
