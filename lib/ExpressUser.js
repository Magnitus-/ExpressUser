//Copyright (c) 2015 Eric Vallee <eric_vallee2003@yahoo.ca>
//MIT License: https://raw.githubusercontent.com/Magnitus-/ExpressUser/master/License.txt

var Express = require('express');

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

var MainRoutes = {};

MainRoutes['UsersPOST'] = function(UserStore) {
    return(function(Req, Res, Next) {
        var RoutingVars = Res.locals.ExpressUser ? Res.locals.ExpressUser : null;
        if(RoutingVars)
        {
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
        }
        else
        {
            Res.status(400).end();
        }
    });
};

MainRoutes['UserPATCH'] = function(UserStore) {
    return(function(Req, Res, Next) {
        var RoutingVars = Res.locals.ExpressUser ? Res.locals.ExpressUser : null;
        if(RoutingVars)
        {
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
        }
        else
        {
            Res.status(400).end();
        }
    });
};

MainRoutes['UserDELETE'] = function(UserStore) {
    return(function(Req, Res, Next) {
        var RoutingVars = Res.locals.ExpressUser ? Res.locals.ExpressUser : null;
        if(RoutingVars)
        {
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
        }
        else
        {
            Res.status(400).end();
        }
    });
};

MainRoutes['UserGET'] = function(UserStore, GetSerializer) {
    return(function(Req, Res, Next) {
        var RoutingVars = Res.locals.ExpressUser ? Res.locals.ExpressUser : null;
        if(RoutingVars)
        {
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
        }
        else
        {
            Res.status(400).end();
        }
    });
};

MainRoutes['SessionUserPUT']  = function(UserStore) {
    return(function(Req, Res, Next) {
        var RoutingVars = Res.locals.ExpressUser ? Res.locals.ExpressUser : null;
        if(RoutingVars)
        {
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
        }
        else
        {
            Res.status(400).end();
        }
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

function ExpressUser(UserStore, Options, Callback)
{
    var ConnectionSecurity = Options && Options.ConnectionSecurity ? Options.ConnectionSecurity : function(Req) {
        return((Req.ip=='127.0.0.1')||Req.secure);
    };
    var Validator = Options && Options.Validator ? Options.Validator : null;
    var Roles = Options && Options.Roles ? Options.Roles : {'Edit': ['Admin'], 'Delete': ['Admin'], 'Get': ['Admin']};
    var HidePassword = Options && Options.HidePassword ? Options.HidePassword : false;
    var GetSerializer = Options && Options.GetSerializer ? Options.GetSerializer : function(Req, Res, Next, User) {
        if(Options.HidePassword)
        {
            delete User['Password'];
        }
        Res.status(200).json(User);
    };
    
    var Router = Express.Router();
    
    if(ConnectionSecurity)
    {
        Router.use('/Users', ConnectionCheckGenerator(ConnectionSecurity));
        Router.use('/User', ConnectionCheckGenerator(ConnectionSecurity));
        Router.use('/Session/Self/User', ConnectionCheckGenerator(ConnectionSecurity));
    }
    
    Router.patch('/User/Self', ExpressUser.AuthenticateRoute());
    Router.delete('/User/Self', ExpressUser.AuthenticateRoute());
    Router.get('/User/Self', ExpressUser.AuthenticateRoute());
    
    if(Roles&&Roles.Edit)
    {
        Router.patch('/User/:Field/:ID', ExpressUser.AuthenticateRoute(Roles['Edit']));
    }
    
    if(Roles&&Roles.Delete)
    {
        Router.delete('/User/:Field/:ID', ExpressUser.AuthenticateRoute(Roles['Delete']));
    }
    
    if(Roles&&Roles.Get)
    {
        Router.get('/User/:Field/:ID', ExpressUser.AuthenticateRoute(Roles['Get']));
    }
    
    if(Validator)
    {
        Validator(Router);
    }
    
    Router.post('/Users', MainRoutes.UsersPOST(UserStore));
    Router.patch('/User/Self', MainRoutes.UserPATCH(UserStore));
    Router.delete('/User/Self', MainRoutes.UserDELETE(UserStore));
    Router.get('/User/Self', MainRoutes.UserGET(UserStore, GetSerializer));
    
    if(Roles&&Roles.Edit)
    {
        Router.patch('/User/:Field/:ID', MainRoutes.UserPATCH(UserStore));
    }
    
    if(Roles&&Roles.Delete)
    {
        Router.delete('/User/:Field/:ID', MainRoutes.UserDELETE(UserStore));
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

ExpressUser.Authenticate = function(Req, Groups, Or)
{
    var IsOr = Or ? Or : true;
    if(Req.session&&Req.session.User)
    {
        if(Groups)
        {
            var Operator = Or ? 'some' : 'every';
            return(Groups[Operator](function(Group, GroupIndex, GroupList) {
                return(Req.session.User.Memberships.some(function(Membership, MembershipIndex, MembershipList) {
                    return(Membership==Group); 
                }));
            }));
        }
        else
        {
            return(true);
        }
    }
    
    return(false);
}

ExpressUser.AuthenticateRoute = function(Groups, Or)
{
    return(function(Req, Res, Next) {
        if(ExpressUser.Authenticate(Req, Groups, Or))
        {
            Next();
        }
        else
        {
            Res.status(401).end();
        }
    });
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

