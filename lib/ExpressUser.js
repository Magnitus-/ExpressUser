//Copyright (c) 2015 Eric Vallee <eric_vallee2003@yahoo.ca>
//MIT License: https://raw.githubusercontent.com/Magnitus-/ExpressUser/master/License.txt

var Express = require('express');

function GetRoutingVars(Req, Res, Next, Callback)
{
    var RoutingVars = Res.locals.ExpressUser ? Res.locals.ExpressUser : null;
    if(RoutingVars)
    {
        Callback(RoutingVars)
    }
    else
    {
        var Err = new Error();
        Err.Source = "ExpressUser";
        Err.Type = "NotValidated";
        Next(Err);
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
                        var Err = new Error();
                        Err.Source = "UserStore";
                        Err.Type = "StoreConstraint";
                        Next(Err);
                    }
                    else
                    {
                        Next(Err);
                    }
                }
                else if(Result.length==0)
                {
                    var Err = new Error();
                    Err.Source = "ExpressUser";
                    Err.Type = "NoInsertion";
                    Next(Err);
                }
                else
                {
                    Next();
                }
            });
        });
    });
};

MainRoutes['UserPATCH'] = function(UserStore) {
    return(function(Req, Res, Next) {
        GetRoutingVars(Req, Res, Next, function(RoutingVars) {
            var Callback = function(Err, Result) {
                if(Err)
                {
                    if(Err.UserStore && Err.UserStore.Name == 'ConstraintError')
                    {
                        var Err = new Error();
                        Err.Source = "UserStore";
                        Err.Type = "StoreConstraint";
                        Next(Err);
                    }
                    else
                    {
                        Next(Err);
                    }
                }
                else if(Result === 0 || Result === null)
                {
                    var Err = new Error();
                    Err.Source = "ExpressUser";
                    Err.Type = "NoUpdate";
                    Next(Err);
                }
                else
                {
                    if(RoutingVars['GetUpdatedUser'])
                    {
                        RoutingVars['Result'] = Result;
                    }
                    Next();
                }
            };
            //Technically, could just call UpdateAtomic/UpdateGetAtomic for both cases, but the Update call is kept for backward-compatibility reasons until version 2.x.x
            if(!RoutingVars['Memberships'])
            {
                if(RoutingVars['GetUpdatedUser'])
                {
                    UserStore.UpdateGet(RoutingVars['User'], RoutingVars['Update'], Callback);
                }
                else
                {
                    UserStore.Update(RoutingVars['User'], RoutingVars['Update'], Callback);
                }
            }
            else
            {
                if(RoutingVars['GetUpdatedUser'])
                {
                    UserStore.UpdateGetAtomic(RoutingVars['User'], RoutingVars['Update'], RoutingVars['Memberships'], Callback);
                }
                else
                {
                    UserStore.UpdateAtomic(RoutingVars['User'], RoutingVars['Update'], RoutingVars['Memberships'], Callback);
                }
            }
            
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
                    var Err = new Error();
                    Err.Source = "ExpressUser";
                    Err.Type = "NoDelete";
                    Next(Err);
                }
                else
                {
                    Next();
                }
            });
        });
    });
};

MainRoutes['UserGET'] = function(UserStore) {
    return(function(Req, Res, Next) {
        GetRoutingVars(Req, Res, Next, function(RoutingVars) {
            UserStore.Get(RoutingVars['User'], function(Err, Result) {
                if(Err)
                {
                    Next(Err);
                }
                else if(!Result)
                {
                    var Err = new Error();
                    Err.Source = "ExpressUser";
                    Err.Type = "NoUser";
                    Next(Err);
                }
                else
                {
                    RoutingVars.Result = Result;
                    Next();
                }
            });
        });
    });
};

MainRoutes['UsersCountGET'] = function(UserStore) {
    return(function(Req, Res, Next) {
        GetRoutingVars(Req, Res, Next, function(RoutingVars) {
            UserStore.Count(RoutingVars['User'], function(Err, Count) {
                if(Err)
                {
                    Next(Err);
                }
                else
                {
                    RoutingVars.Result = Count;
                    Next();
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
                    var Err = new Error();
                    Err.Source = "ExpressUser";
                    Err.Type = "NoUser";
                    Next(Err);
                }
                else
                {
                    Req.session.User = Result;
                    Next();
                }
            });
        });
    });
};

MainRoutes['SessionUserDELETE']  = function(UserStore) {
    return(function(Req, Res, Next) {
        GetRoutingVars(Req, Res, Next, function(RoutingVars) {
            if(!(Req.session&&Req.session.User))
            {
                var Err = new Error();
                Err.Source = "ExpressUser";
                Err.Type = "NoSessionUser";
                Next(Err);
            }
            else
            {
                delete Req.session['User'];
                Next();
            }
        });
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
                    var Err = new Error();
                    Err.Source = "ExpressUser";
                    Err.Type = "NoInsertion";
                    Next(Err);
                }
                else
                {
                    Next();
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
                    var Err = new Error();
                    Err.Source = "ExpressUser";
                    Err.Type = "NoDeletion";
                    Next(Err);
                }
                else
                {
                    Next();
                }
            });
        });
    });
};

function ExpressUser(UserStore, Options, Callback)
{
    var Validator = Options && Options.Validator ? Options.Validator : null;
    var Responder = Options && Options.Responder ? Options.Responder : null;
    
    var Router = Express.Router();
    
    if(Validator)
    {
        Validator(Router);
    }
    
    Router.post('/Users', MainRoutes.UsersPOST(UserStore));
    Router.patch('/User/Self', MainRoutes.UserPATCH(UserStore));
    Router.patch('/User/:Field/:ID', MainRoutes.UserPATCH(UserStore));
    Router.post('/User/Self/Recovery/:SetField', MainRoutes.UserPATCH(UserStore));
    Router.delete('/User/Self', MainRoutes.UserDELETE(UserStore));
    Router.delete('/User/:Field/:ID', MainRoutes.UserDELETE(UserStore));
    Router.get('/User/Self', MainRoutes.UserGET(UserStore));
    Router.get('/User/:Field/:ID', MainRoutes.UserGET(UserStore));
    Router.get('/Users/:Field/:ID/Count', MainRoutes.UsersCountGET(UserStore));
    Router.post('/User/:Field/:ID/Recovery/:SetField', MainRoutes.UserPATCH(UserStore));
    
    Router.put('/User/Self/Memberships/:Membership', MainRoutes.UserMembershipsPUT(UserStore));
    Router.put('/User/:Field/:ID/Memberships/:Membership', MainRoutes.UserMembershipsPUT(UserStore));
    Router.delete('/User/Self/Memberships/:Membership', MainRoutes.UserMembershipsDELETE(UserStore));
    Router.delete('/User/:Field/:ID/Memberships/:Membership', MainRoutes.UserMembershipsDELETE(UserStore));
    
    Router.put('/Session/Self/User', MainRoutes.SessionUserPUT(UserStore));
    Router.delete('/Session/Self/User', MainRoutes.SessionUserDELETE(UserStore));
    
    if(Responder)
    {
        Responder(Router);
    }
    
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

