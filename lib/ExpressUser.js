//Copyright (c) 2015 Eric Vallee <eric_vallee2003@yahoo.ca>
//MIT License: https://raw.githubusercontent.com/Magnitus-/ExpressUser/master/License.txt

var Express = require('express');
var AccessControl = require('express-access-control');

function ConnectionCheckGenerator(Check) 
{
    return(function(Req, Res, Next) {
        if(!Check(Req))
        {
            Res.status(400).end();
            return;
        }
        else
        {
            Next();
        }
    });
}

function GetRoutingVars(Req, Res, Next, Callback)
{
    var RoutingVars = Res.locals.ExpressUser ? Res.locals.ExpressUser : null;
    if(RoutingVars)
    {
        Callback(RoutingVars)
    }
    else
    {
        Res.status(400).end();
    }
}

var MainRoutes = {};

MainRoutes['UsersPOST'] = function(UserStore) {
    return(function(Req, Res, Next) {
        GetRoutingVars(Req, Res, Next, function(RoutingVars) {
            UserStore.Add(RoutingVars['User'], function(Err, Result) {
                if(Err)
                {
                    if(Err.UserStore && Err.UserStore.Name == 'ConstraintError')
                    {
                        Res.status(400).end();
                    }
                    else
                    {
                        Next(Err);
                    }
                }
                else if(Result.length==0)
                {
                    Res.status(400).end();
                }
                else
                {
                    Res.status(201).end();
                }
            });
        });
    });
};

MainRoutes['UserPATCH'] = function(UserStore) {
    return(function(Req, Res, Next) {
        GetRoutingVars(Req, Res, Next, function(RoutingVars) {
            UserStore.Update(RoutingVars['User'], RoutingVars['Update'], function(Err, Result) {
                if(Err)
                {
                    Next(Err);
                }
                else if(Result==0)
                {
                    Res.status(400).end();
                }
                else
                {
                    Res.status(204).end();
                }
            });
        });
    });
};

MainRoutes['UserDELETE'] = function(UserStore) {
    return(function(Req, Res, Next) {
        GetRoutingVars(Req, Res, Next, function(RoutingVars) {
            UserStore.Remove(RoutingVars['User'], function(Err, Result) {
                if(Err)
                {
                    Next(Err);
                }
                else if(Result==0)
                {
                    Res.status(400).end();
                }
                else
                {
                    Res.status(204).end();
                }
            });
        });
    });
};

MainRoutes['UserGET'] = function(UserStore, GetSerializer) {
    return(function(Req, Res, Next) {
        GetRoutingVars(Req, Res, Next, function(RoutingVars) {
            UserStore.Get(RoutingVars['User'], function(Err, Result) {
                if(Err)
                {
                    Next(Err);
                }
                else if(!Result)
                {
                    Res.status(400).end();
                }
                else
                {
                    GetSerializer(Req, Res, Next, Result);
                }
            });
        });
    });
};

MainRoutes['UsersCountGET'] = function(UserStore, CountSerializer) {
    return(function(Req, Res, Next) {
        GetRoutingVars(Req, Res, Next, function(RoutingVars) {
            UserStore.Count(RoutingVars['User'], function(Err, Count) {
                if(Err)
                {
                    Next(Err);
                }
                else
                {
                    CountSerializer(Req, Res, Next, Count);
                }
            });
        });
    });
}

MainRoutes['SessionUserPUT']  = function(UserStore) {
    return(function(Req, Res, Next) {
        GetRoutingVars(Req, Res, Next, function(RoutingVars) {
            UserStore.Get(RoutingVars['User'], function(Err, Result) {
                if(Err)
                {
                    Next(Err);
                }
                else if(!Result)
                {
                    Res.status(400).end();
                }
                else
                {
                    Req.session.User = Result;
                    Res.status(204).end();
                }
            });
        });
    });
};

MainRoutes['SessionUserDELETE']  = function(UserStore) {
    return(function(Req, Res, Next) {
        if(!Req.session.User)
        {
            Res.status(410).end();
        }
        else
        {
            delete Req.session['User'];
            Res.status(204).end();
        }
    });
};

MainRoutes['UserMembershipsPUT'] = function(UserStore) {
    return(function(Req, Res, Next) {
        GetRoutingVars(Req, Res, Next, function(RoutingVars) {
            UserStore.AddMembership(RoutingVars['User'], RoutingVars['Membership'], function(Err, Result) {
                if(Err)
                {
                    Next(Err);
                }
                else if(Result==0)
                {
                    Res.status(400).end();
                }
                else
                {
                    Res.status(204).end();
                }
            });
        });
    });
};

MainRoutes['UserMembershipsDELETE'] = function(UserStore) {
    return(function(Req, Res, Next) {
        GetRoutingVars(Req, Res, Next, function(RoutingVars) {
            UserStore.RemoveMembership(RoutingVars['User'], RoutingVars['Membership'], function(Err, Result) {
                if(Err)
                {
                    Next(Err);
                }
                else if(Result==0)
                {
                    Res.status(400).end();
                }
                else
                {
                    Res.status(204).end();
                }
            });
        });
    });
};

function ExpressUser(UserStore, Options, Callback)
{
    var ConnectionSecurity = Options && Options.ConnectionSecurity ? Options.ConnectionSecurity : function(Req) {
        return((Req.ip=='127.0.0.1')||Req.secure);
    };
    var Validator = Options && Options.Validator ? Options.Validator : null;
    var Roles = Options && Options.Roles ? Options.Roles : {'Edit': ['Admin'], 'Delete': ['Admin'], 'Get': ['Admin']};
    var GetSerializer = Options && Options.GetSerializer ? Options.GetSerializer : function(Req, Res, Next, User) {
        GetRoutingVars(Req, Res, Next, function(RoutingVars) {
            if(RoutingVars.Hide)
            {
                RoutingVars.Hide.forEach(function(Field, Index, List) {
                    delete User[Field];
                });
            }
            Res.status(200).json(User);
        });
    };
    var CountSerializer = Options && Options.CountSerializer ? Options.CountSerializer : function(Req, Res, Next, Count) {
        Res.status(200).json({'Count': Count});
    };
    
    var Router = Express.Router();
    
    if(ConnectionSecurity)
    {
        Router.use('/Users', ConnectionCheckGenerator(ConnectionSecurity));
        Router.use('/User', ConnectionCheckGenerator(ConnectionSecurity));
        Router.use('/Session/Self/User', ConnectionCheckGenerator(ConnectionSecurity));
    }
    
    Router.patch('/User/Self', AccessControl.AuthenticateRoute());
    Router.delete('/User/Self', AccessControl.AuthenticateRoute());
    Router.get('/User/Self', AccessControl.AuthenticateRoute());
    
    if(Roles&&Roles.Edit)
    {
        Router.patch('/User/:Field/:ID', AccessControl.AuthenticateRoute(Roles['Edit']));
        Router.put('/User/:Field/:ID/Memberships/:Membership', AccessControl.AuthenticateRoute(Roles['Edit']));
    }
    
    if(Roles&&Roles.Delete)
    {
        Router.delete('/User/:Field/:ID', AccessControl.AuthenticateRoute(Roles['Delete']));
        Router.delete('/User/:Field/:ID/Memberships/:Membership', AccessControl.AuthenticateRoute(Roles['Delete']));
    }
    
    if(Roles&&Roles.Get)
    {
        Router.get('/User/:Field/:ID', AccessControl.AuthenticateRoute(Roles['Get']));
    }
    
    if(Validator)
    {
        Validator(Router, Options.Roles);
    }
    
    Router.post('/Users', MainRoutes.UsersPOST(UserStore));
    Router.patch('/User/Self', MainRoutes.UserPATCH(UserStore));
    Router.delete('/User/Self', MainRoutes.UserDELETE(UserStore));
    Router.get('/User/Self', MainRoutes.UserGET(UserStore, GetSerializer));
    Router.get('/Users/:Field/:ID/Count', MainRoutes.UsersCountGET(UserStore, CountSerializer));
    
    Router.put('/User/Self/Memberships/:Membership', MainRoutes.UserMembershipsPUT(UserStore));
    Router.delete('/User/Self/Memberships/:Membership', MainRoutes.UserMembershipsDELETE(UserStore));
    
    if(Roles&&Roles.Edit)
    {
        Router.patch('/User/:Field/:ID', MainRoutes.UserPATCH(UserStore));
        Router.put('/User/:Field/:ID/Memberships/:Membership', MainRoutes.UserMembershipsPUT(UserStore));
    }
    
    if(Roles&&Roles.Delete)
    {
        Router.delete('/User/:Field/:ID', MainRoutes.UserDELETE(UserStore));
        Router.delete('/User/:Field/:ID/Memberships/:Membership', MainRoutes.UserMembershipsDELETE(UserStore));
    }
    
    if(Roles&&Roles.Get)
    {
        Router.get('/User/:Field/:ID', MainRoutes.UserGET(UserStore, GetSerializer));
    }
    
    Router.put('/Session/Self/User', MainRoutes.SessionUserPUT(UserStore));
    Router.delete('/Session/Self/User', MainRoutes.SessionUserDELETE(UserStore));
    
    if(Callback)
    {
        Callback(Router);
    }
    else
    {
        return Router;
    }
}

//Alternative:
//Augment session-store such that certain fields are read-only (saved on initialization outside of 'Data', not re-saved afterwards).
//Sessions need to be updated with user-store updates/deletes
ExpressUser.SessionRoute = function(UserStore, Constant)
{
    return(function(Req, Res, Next) {
        if(Req.session && Req.session.User)
        {
            var User = {};
            User[Constant] = Req.session.User[Constant];
            UserStore.Get(User, function(Err, Result) {
                if(Err)
                {
                    Next(Err);
                    return;
                }
                else if(!Result)
                {
                    delete Req.session['User'];
                }
                else
                {
                    Req.session.User = Result;
                }
                Next();
            });
        }
        else
        {
            Next();
        }
    });
}

module.exports = ExpressUser;

