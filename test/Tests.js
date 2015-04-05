//Copyright (c) 2015 Eric Vallee <eric_vallee2003@yahoo.ca>
//MIT License: https://raw.githubusercontent.com/Magnitus-/ExpressUser/master/License.txt

var Nimble = require('nimble');
var Express = require('express');
var Http = require('http');
var ExpressUser = require('../lib/ExpressUser');
var UserStore = require('user-store');
var MongoDB = require('mongodb');
var Session = require('express-session');
var SessionStore= require('express-session-mongodb');
var BodyParser = require('body-parser');

var Context = {};

var RandomIdentifier = 'ExpressUserTests'+Math.random().toString(36).slice(-8);

var SessionStoreOptions = {'TimeToLive': 300, 'IndexSessionID': true, 'DeleteFlags': true};

function Middleware(Routes)
{
    return(function(Router, Roles) {
        Routes.forEach(function(Route) {
            Router[Route['Method']](Route['Path'], Route['Call']);
        });
    });
}

function Setup(ValidationRoutes, ResponseRoutes, Callback)
{
    MongoDB.MongoClient.connect("mongodb://localhost:27017/"+RandomIdentifier, {native_parser:true}, function(Err, DB) {
        UserStore(DB, {'Email': {'Unique': 1, 'NotNull': 1}, 'Username': {'Unique': 1, 'NotNull': 1}, 'Password': {'NotNull': 1}}, function(Err, UserStoreInst) {
            SessionStore(DB, function(Err, SessionStoreInst) {
                Context['DB'] = DB;
                Context['UserStore'] = UserStoreInst;
                var App = Context['App'] = Express();
                
                App.use(Session({
                    'secret': 'qwerty!',
                    'resave': true,
                    'saveUninitialized': true,
                    'store': SessionStoreInst
                }));
                
                App.use(BodyParser.json());
                
                var UserRouter = ExpressUser(UserStoreInst, {'Validator': Middleware(ValidationRoutes), 'Responder': Middleware(ResponseRoutes)});
                App.use(ExpressUser.SessionRoute(UserStoreInst, '_id'));
                
                App.put('/User/Self/Memberships/Admin', function(Req, Res, Next) {
                    if(Req.session.User)
                    {
                        UserStoreInst.AddMembership({'Email': Req.session.User.Email}, 'Admin', function(Err, Result) {
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
                
                App.get('/Session/Self/User', function(Req, Res, Next) {
                    if(Req.session.User)
                    {
                        Res.status(200).json(Req.session.User);
                    }
                    else
                    {
                        Res.status(400).end();
                    }
                });
                
                App.use(UserRouter);
                
                App.use('/', function(Err, Req, Res, Next) {
                    if(Err.Type)
                    {
                        Res.status(400).json({'ErrType': Err.Type, 'ErrSource': Err.Source});
                    }
                    else
                    {
                        Next(Err);
                    }
                });
                
                Context['Server'] = Http.createServer(Context['App']);
                Context['Server'].listen(8080, function() {
                    Callback();
                });
            }, SessionStoreOptions);
        });
    });
}

function TearDown(Callback)
{
    Context.Server.close(function() {
        Context.DB.dropDatabase(function(Err, Result) {
            Context.DB.close();
            Callback();
        });
    });
}

function RequestHandler()
{
    this.SessionID = null;
    if(!RequestHandler.prototype.SetSessionID)
    {
        RequestHandler.prototype.SetSessionID = function(Headers) {
            if(Headers["set-cookie"])
            {
                var SessionCookie = Headers["set-cookie"][0];
                SessionCookie = SessionCookie.slice(String("connect.sid=").length, SessionCookie.indexOf(';'));
                this.SessionID = SessionCookie;
            }
        };
        
        RequestHandler.prototype.Request = function(Method, Path, Callback, ReqBody, GetBody) {
            var Self = this;
            var RequestObject = {'hostname': 'localhost', 'port': 8080, 'method': Method, 'path': Path, 'headers': {'Accept': 'application/json'}};
            if(this.SessionID)
            {
                RequestObject['headers']['cookie'] = 'connect.sid='+this.SessionID;
            }
            if(ReqBody)
            {
                RequestObject.headers['Content-Type']='application/json';
                RequestObject.headers['Content-Length']=(JSON.stringify(ReqBody)).length;
            }
            var Req = Http.request(RequestObject, function(Res) {
                Res.setEncoding('utf8');
                var Body = "";
                if(!GetBody)
                {
                    Res.resume();
                }
                else
                {
                    Res.on('data', function (Chunk) {
                        Body+=Chunk;
                    });
                }
                Res.on('end', function() {
                    Self.SetSessionID(Res.headers);
                    Body = GetBody && Body ? JSON.parse(Body) : null;
                    Callback(Res.statusCode, Body);
                });
            });
            if(ReqBody)
            {
                Req.write(JSON.stringify(ReqBody), function() {
                    Req.end();
                });
            }
            else
            {
                Req.end();
            }
        };
    }
}

var BodyRoute = {'Method': 'use', 'Path': '/', 'Call': function(Req, Res, Next) {
    if(Req.body.User||Req.body.Update||Req.body.Membership)
    {
        Res.locals.ExpressUser = {};
        if(Req.body.User)
        {
            Res.locals.ExpressUser.User = Req.body.User;
        }
        if(Req.body.Update)
        {
            Res.locals.ExpressUser.Update = Req.body.Update;
        }
        if(Req.body.Membership)
        {
            Res.locals.ExpressUser.Membership = Req.body.Membership;
        }
    }
    Next();
}};

var SuccessRoute = {'Method': 'use', 'Path': '/', 'Call': function(Req, Res, Next) {
    if(!(Res.locals.ExpressUser && Res.locals.ExpressUser.Result!==undefined))
    {
        Res.status(200).end();
    }
    else
    {
        if(typeof(Res.locals.ExpressUser.Result) === typeof(0))
        {
            Res.status(200).json({'Count': Res.locals.ExpressUser.Result});
        }
        else
        {
            Res.status(200).json(Res.locals.ExpressUser.Result);
        }
    }
}};



exports.Main = {
    'setUp': function(Callback) {

        Setup([BodyRoute], [SuccessRoute], Callback);
    },
    'tearDown': function(Callback) {
        TearDown(Callback);
    },
    'UserCreation': function(Test) {
        Test.expect(2);
        var Requester = new RequestHandler();
        Requester.Request('POST', '/Users', function(Status, Body) {
            Context['UserStore'].Get({'Username': 'SomeName'}, function(Err, User) {
                Test.ok(User && Status===200, "Confirming that POST /Users route generate users");
                Requester.Request('POST', '/Users', function(Status, Body) {
                    Test.ok(Body && Body.ErrType && Body.ErrSource && Body.ErrType === 'StoreConstraint' && Body.ErrSource === 'UserStore', "Confirming that constraint violation get properly routed on POST /Users route.");
                    Test.done();
                }, {'User': {'Username': 'SomeName'}}, true);
            });
        }, {'User': {'Username': 'SomeName', 'Email': 'SomeEmail@Email.com', 'Password': 'Qwerty!'}}, false);
    },
    'LoginLogout': function(Test) { //Good insert and good delete left
        Test.expect(4);
        var Requester = new RequestHandler();
        Requester.Request('POST', '/Users', function(Status, Body) {
            Requester.Request('PUT', '/Session/Self/User', function(Status, Body) {
                Test.ok(Status===400 && Body && Body.ErrType && Body.ErrType === "NoUser", "Confirming that passing credentials of non-existent user on PUT /Session/Self/User routes triggers the right error.");
                Requester.Request('DELETE', '/Session/Self/User', function(Status, Body) {
                    Test.ok(Status===400 && Body && Body.ErrType && Body.ErrType === "NoSessionUser", "Confirming that trying to delete a non-existent session on DELETE /Session/Self/User routes triggers the right error.");  
                    Requester.Request('PUT', '/Session/Self/User', function(LoginStatus, Body) {
                        Requester.Request('GET', '/Session/Self/User', function(Status, Body) {
                            Test.ok(LoginStatus===200 && Body && Body.Email === 'SomeEmail@Email.com', "Confirming that PUT /Session/Self/User route logins the user.");
                            Requester.Request('DELETE', '/Session/Self/User', function(LogoutStatus, Body) {
                                Requester.Request('GET', '/Session/Self/User', function(GetSessionStatus, Body) {
                                    Test.ok(LogoutStatus===200 && GetSessionStatus===400, "Confirming that DELETE /Session/Self/User route logs out the user.");
                                    Test.done();
                                }, null, false);
                            }, {'User': {}}, false);
                        }, null, true);
                    }, {'User':{'Username': 'SomeName'}}, false);
                }, {'User': {}}, true);
            }, {'User': {'Username': 'SomeName', 'Email': 'SomeEmail@Email.com', 'Password': 'Qwerty2!'}}, true);
        }, {'User': {'Username': 'SomeName', 'Email': 'SomeEmail@Email.com', 'Password': 'Qwerty!'}}, false);
    },
    'UserDeletion': function(Test) {
        Test.expect(4);
        var Requester = new RequestHandler();
        Requester.Request('DELETE', '/User/Self', function(Status, Body) {
            Test.ok(Status===400 && Body.ErrType && Body.ErrType==="NoDelete", "Confirming that trying to delete a non-existent user on route DELETE /User/Self triggers the right error.");
            Requester.Request('DELETE', '/User/Username/SomeName', function(Status, Body) {
                Test.ok(Status===400 && Body.ErrType && Body.ErrType==="NoDelete", "Confirming that trying to delete a non-existent user on route DELETE /User/:Field/:ID triggers the right error."); 
                Requester.Request('POST', '/Users', function(Status, Body) {
                    Requester.Request('POST', '/Users', function(Status, Body) {
                        Requester.Request('DELETE', '/User/Self', function(Status, Body) {
                            Context['UserStore'].Get({'Username': 'SomeName'}, function(Err, User) {
                                Test.ok(Status===200 && (!User), "Confirming that user deletion with route DELETE /User/Self works.");
                                Requester.Request('DELETE', '/User/Username/SomeName2', function(Status, Body) {
                                    Context['UserStore'].Get({'Username': 'SomeName2'}, function(Err, User) {
                                        Test.ok(Status===200 && (!User), "Confirming that user deletion with route DELETE /User/:Field/:ID works.");
                                        Test.done();
                                    });
                                }, {'User': {'Username': 'SomeName2'}}, false);
                            });
                        }, {'User': {'Username': 'SomeName'}}, false);
                    }, {'User': {'Username': 'SomeName2', 'Email': 'SomeEmail2@Email.com', 'Password': 'Qwerty!'}}, false);
                }, {'User': {'Username': 'SomeName', 'Email': 'SomeEmail@Email.com', 'Password': 'Qwerty!'}}, false);
            }, {'User': {'Username': 'SomeName'}}, true);
        }, {'User': {'Username': 'SomeName'}}, true);
    },
    'UserModification': function(Test) {
        Test.expect(6);
        var Requester = new RequestHandler();
        Requester.Request('PATCH', '/User/Self', function(Status, Body) {
            Test.ok(Status===400 && Body.ErrType && Body.ErrType==="NoUpdate", "Confirming that trying to update a non-existent user on route PATCH /User/Self triggers the right error.");
            Requester.Request('PATCH', '/User/Username/SomeName', function(Status, Body) {
                Test.ok(Status===400 && Body.ErrType && Body.ErrType==="NoUpdate", "Confirming that trying to update a non-existent user on route PATCH /User/:Field/:ID triggers the right error.");
                Requester.Request('POST', '/Users', function(Status, Body) {
                    Requester.Request('PATCH', '/User/Self', function(Status, Body) {
                        Context['UserStore'].Get({'Username': 'SomeName'}, function(Err, User) {
                            Test.ok(Status===200 && User && User.Email === "AnotherEmail@Email.com", "Confirming that updating works with the PATCH /User/Self route.");
                            Requester.Request('PATCH', '/User/Username/SomeName', function(Status, Body) {
                                Context['UserStore'].Get({'Username': 'SomeName'}, function(Err, User) {
                                    Test.ok(Status===200 && User && User.Email === "YetAnotherEmail@Email.com", "Confirming that updating works with the PATCH /User/:Field/:ID route.");
                                    Requester.Request('POST', '/Users', function(Status, Body) {
                                        Requester.Request('PATCH', '/User/Self', function(Status, Body) {
                                            Test.ok(Status===400 && Body.ErrType && Body.ErrType==="StoreConstraint", "Confirming that trying that violating user store constraints triggers the right error for the PATCH /User/Self route.");
                                            Requester.Request('PATCH', '/User/Username/SomeName', function(Status, Body) {
                                                Test.ok(Status===400 && Body.ErrType && Body.ErrType==="StoreConstraint", "Confirming that trying that violating user store constraints triggers the right error for the PATCH /User/:Field/:ID route.");
                                                Test.done();
                                            }, {'User': {'Username': 'AnotherName'}, 'Update': {'Username': 'SomeName'}}, true);
                                        }, {'User': {'Username': 'AnotherName'}, 'Update': {'Username': 'SomeName'}}, true);
                                    }, {'User': {'Username': 'AnotherName', 'Email': 'Unimportant@Email.com', 'Password': 'Qwerty!'}}, false); 
                                });
                            }, {'User': {'Username': 'SomeName'}, 'Update': {'Email': 'YetAnotherEmail@Email.com'}}, true);
                        });
                    }, {'User': {'Username': 'SomeName'}, 'Update': {'Email': 'AnotherEmail@Email.com'}}, true);
                }, {'User': {'Username': 'SomeName', 'Email': 'SomeEmail@Email.com', 'Password': 'Qwerty!'}}, false);
            }, {'User': {'Username': 'SomeName'}, 'Update': {'Username': 'SomeName2'}}, true);
        }, {'User': {'Username': 'SomeName'}, 'Update': {'Username': 'SomeName2'}}, true);
    },
    'UserGet': function(Test) {
        Test.expect(4);
        var Requester = new RequestHandler();
        Requester.Request('GET', '/User/Self', function(Status, Body) {
            Test.ok(Status===400 && Body.ErrType && Body.ErrType === "NoUser", "Confirming that fetching a non-existent user on route GET /User/Self triggers the right error.");
            Requester.Request('GET', '/User/Username/SomeName', function(Status, Body) {
                Test.ok(Status===400 && Body.ErrType && Body.ErrType === "NoUser", "Confirming that fetching a non-existent user on route GET /User/:Field/:ID triggers the right error.");
                    Requester.Request('POST', '/Users', function(Status, Body) {
                        Requester.Request('GET', '/User/Self', function(Status, Body) {
                            Test.ok(Status === 200 && Body.Username === 'SomeName' && Body.Email === 'SomeEmail@Email.com', "Confirming that fetching a user on route GET /User/Self works.");
                            Requester.Request('GET', '/User/Username/SomeName', function(Status, Body) {
                                Test.ok(Status === 200 && Body.Username === 'SomeName' && Body.Email === 'SomeEmail@Email.com', "Confirming that fetching a user on route GET /User/:Field/:ID works.");
                                Test.done();
                            }, {'User': {'Username': 'SomeName'}}, true);
                        }, {'User': {'Username': 'SomeName'}}, true);
                }, {'User': {'Username': 'SomeName', 'Email': 'SomeEmail@Email.com', 'Password': 'Qwerty!'}}, false);
            }, {'User': {'Username': 'SomeName'}}, true);
        }, {'User': {'Username': 'SomeName'}}, true);
    },
    'UserCount': function(Test) {
        Test.expect(2);
        var Requester = new RequestHandler();
        Requester.Request('GET', '/Users/Username/SomeName/Count', function(Status, Body) {
            Test.ok(Status === 200 && Body.Count===0, "Confirming that couting on route GET /Users/:Field/:ID/Count works, case 1.");
            Requester.Request('POST', '/Users', function(Status, Body) {
                Requester.Request('GET', '/Users/Username/SomeName/Count', function(Status, Body) {
                    Test.ok(Status === 200 && Body.Count===1, "Confirming that couting on route GET /Users/:Field/:ID/Count works, case 2.");
                    Test.done();
                }, {'User': {'Username': 'SomeName'}}, true);
            }, {'User': {'Username': 'SomeName', 'Email': 'SomeEmail@Email.com', 'Password': 'Qwerty!'}}, false);
        }, {'User': {'Username': 'SomeName'}}, true);
    },
    'Memberships': function(Test) {
        Test.expect(10);
        var Requester = new RequestHandler();
        Requester.Request('PUT', '/User/Self/Memberships/Banned', function(Status, Body) {
            Test.ok(Status===400 && Body.ErrType && Body.ErrType==="NoInsertion", "Confirming that adding membership to non-existent user on route PUT /User/Self/Memberships/:Membership triggers the right error.");
            Requester.Request('PUT', '/User/Username/SomeName/Memberships/Banned', function(Status, Body) {
                Test.ok(Status===400 && Body.ErrType && Body.ErrType==="NoInsertion", "Confirming that adding membership to non-existent user on route PUT /User/:Field/:ID/Memberships/:Membership triggers the right error.");
                Requester.Request('POST', '/Users', function(Status, Body) {
                    Requester.Request('DELETE', '/User/Self/Memberships/Banned', function(Status, Body) {
                        //Might eventually want to change it to report an error like NoMembership
                        Test.ok(Status===200, "Confirming that deleting non-existent membership on route DELETE /User/Self/Memberships/:Membership works as expected.");
                        Requester.Request('DELETE', '/User/Username/SomeName/Memberships/Banned', function(Status, Body) {
                            //Might eventually want to change it to report an error like NoMembership
                            Test.ok(Status===200, "Confirming that deleting non-existent membership on route DELETE /User/:Field/:ID/Memberships/:Membership works as expected.");
                            Requester.Request('PUT', '/User/Self/Memberships/Banned1', function(Status, Body) {
                                Context['UserStore'].Get({'Username': 'SomeName'}, function(Err, User) {
                                    Test.ok(Status===200&&User.Memberships.some(function(Item) {
                                        return Item==="Banned1";
                                    }), "Confirming that route PUT /User/Self/Memberships/:Membership works for adding memberships");
                                    Requester.Request('PUT', '/User/Username/SomeName/Memberships/Banned2', function(Status, Body) {
                                        Context['UserStore'].Get({'Username': 'SomeName'}, function(Err, User) {
                                            Test.ok(Status===200&&User.Memberships.some(function(Item) {
                                                return Item==="Banned2";
                                            }), "Confirming that route PUT /User/:Field/:ID/Memberships/:Membership works for adding memberships");
                                            Requester.Request('PUT', '/User/Self/Memberships/Banned1', function(Status, Body) {
                                                //Might eventually want to change it to report an error like MembershipExists
                                                Test.ok(Status===200, "Confirming that inserting an already existing membership in route PUT /User/Self/Memberships/:Membership behaves as expected.");
                                                Requester.Request('PUT', '/User/Username/SomeName/Memberships/Banned1', function(Status, Body) {
                                                    //Might eventually want to change it to report an error like MembershipExists
                                                    Test.ok(Status===200, "Confirming that inserting an already existing membership in route PUT /User/:Field/:ID/Memberships/:Membership behaves as expected.");
                                                    Requester.Request('DELETE', '/User/Self/Memberships/Banned1', function(Status, Body) {
                                                        Context['UserStore'].Get({'Username': 'SomeName'}, function(Err, User) {
                                                            Test.ok(Status===200&&User.Memberships.every(function(Item) {
                                                                return Item!=="Banned1";
                                                            }), "Confirming that route DELETE /User/Self/Memberships/:Membership works for deleting memberships");
                                                            Requester.Request('DELETE', '/User/Username/SomeName/Memberships/Banned2', function(Status, Body) {
                                                                Context['UserStore'].Get({'Username': 'SomeName'}, function(Err, User) {
                                                                    Test.ok(Status===200&&User.Memberships.every(function(Item) {
                                                                        return Item!=="Banned2";
                                                                    }), "Confirming that route DELETE /User/:Field/:ID/Memberships/:Membership works for deleting memberships");
                                                                    Test.done();
                                                                });
                                                            }, {'User': {'Username': 'SomeName'}, 'Membership': 'Banned2'}, true);
                                                        });
                                                    }, {'User': {'Username': 'SomeName'}, 'Membership': 'Banned1'}, true);
                                                }, {'User': {'Username': 'SomeName'}, 'Membership': 'Banned1'}, true);
                                            }, {'User': {'Username': 'SomeName'}, 'Membership': 'Banned1'}, true);
                                        });
                                    }, {'User': {'Username': 'SomeName'}, 'Membership': 'Banned2'}, true);
                                });
                            }, {'User': {'Username': 'SomeName'}, 'Membership': 'Banned1'}, true);     
                        }, {'User': {'Username': 'SomeName'}, 'Membership': 'Banned'}, true);
                    }, {'User': {'Username': 'SomeName'}, 'Membership': 'Banned'}, true);
                }, {'User': {'Username': 'SomeName', 'Email': 'SomeEmail@Email.com', 'Password': 'Qwerty!'}}, false);
            }, {'User': {'Username': 'SomeName'}, 'Membership': 'Banned'}, true);
        }, {'User': {'Username': 'SomeName'}, 'Membership': 'Banned'}, true);
    },
    'SessionSync': function(Test) {
        Test.expect(2);
        var Requester = new RequestHandler();
        Requester.Request('POST', '/Users', function(Status, Body) {
            Requester.Request('PUT', '/Session/Self/User', function(Status, Body) {
                Requester.Request('PATCH', '/User/Username/SomeName', function(Status, Body) {
                    Requester.Request('GET', '/Session/Self/User', function(Status, Body) {
                        Test.ok(Status===200 && Body.Username && Body.Username === 'SomeName2' && Body.Email && Body.Email === 'SomeEmail2@Email.com', "Confirming that sessions are kept in sync during profile updates");
                        Requester.Request('DELETE', '/User/Username/SomeName', function(Status, Body) {
                            Requester.Request('GET', '/Session/Self/User', function(Status, Body) {
                                Test.ok(Status===400, "Confirming that sessions are kept in sync during profile deletions");
                                Test.done();
                            }, null, true);
                        }, {'User': {'Username': 'SomeName2'}}, false);
                    }, null, true);
                }, {'User': {'Username': 'SomeName'}, 'Update': {'Username': 'SomeName2', 'Email': 'SomeEmail2@Email.com'}}, false);
            }, {'User': {'Username': 'SomeName'}}, false);
        }, {'User': {'Username': 'SomeName', 'Email': 'SomeEmail@Email.com', 'Password': 'Qwerty!'}}, false);
    },
    'ValidationCheck': function(Test) {
        var Routes = [['POST', '/Users'],
                      ['PATCH', '/User/Self'],
                      ['DELETE', '/User/Self'],
                      ['GET', '/User/Self'],
                      ['PATCH', '/User/Username/Test'],
                      ['DELETE', '/User/Username/Test'],
                      ['GET', '/User/Username/Test'],
                      ['PUT', '/User/Self/Memberships/Test'],
                      ['DELETE', '/User/Self/Memberships/Test'],
                      ['PUT', '/User/Username/Test/Memberships/Test'],
                      ['DELETE', '/User/Username/Test/Memberships/Test'],
                      ['POST', '/User/Self/Recovery/Test'],
                      ['POST', '/User/Username/Test/Recovery/Test'],
                      ['PUT', '/Session/Self/User'],
                      ['DELETE', '/Session/Self/User'],
                      ['GET', '/Users/Username/SomeName/Count']];
        Test.expect(Routes.length);
        var Requester = new RequestHandler();
        var Calls = [];
        Routes.forEach(function(Route) {
            Calls.push(function(Callback) {
                Requester.Request(Route[0], Route[1], function(Status, Body) {
                    Test.ok(Status===400 && Body.ErrType && Body.ErrType === "NotValidated", "Confirming validation check is performed on route "+Route[0]+" "+Route[1]+".");
                    Callback();
                }, null, true);
            });
        });
        Nimble.series(Calls, function(Err) {Test.done();});
    }
};

