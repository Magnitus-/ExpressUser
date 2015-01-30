//Copyright (c) 2015 Eric Vallee <eric_vallee2003@yahoo.ca>
//MIT License: https://raw.githubusercontent.com/Magnitus-/ExpressUser/master/License.txt

jQuery.fn.ToJSON = function(IncludeEmpty) {
    var Inputs = this.children('input');
    var ToReturn = {};
    Inputs.each(function(Index, Element) {
        var WrappedElement = jQuery(Element);
        var Value = WrappedElement.val();
        if(Value.length>0||IncludeEmpty)
        {
            ToReturn[WrappedElement.attr('name')] = Value;
        }
    });
    return ToReturn;
}

jQuery.fn.Send = function() {
    var Section = this.closest('section').attr('class');
    var Data = this.ToJSON();
    var URL = null;
    var Method = null;
    if(Section=='Login')
    {
        Method = 'PUT';
        URL = '/Session/User';
    }
    else if(Section=='Logout')
    {
        Method = 'DELETE';
        URL = '/Session/User';
    }
    else if(Section=='Add')
    {
        Method = 'POST';
        URL = "/Users";
    }
    else if(Section=='Modify')
    {
        Method = 'PATCH';
        if(Data['UrlUsername'])
        {
            URL = '/User/Username/'+Data['UrlUsername'];
        }
        else if(Data['UrlEmail'])
        {
            URL = '/User/Email/'+Data['UrlUsername'];
        }
        else
        {
            URL = '/User/Self';
        }
    }
    else if(Section=='Delete')
    {
        Method = 'DELETE';
        if(Data['Username'])
        {
            URL = '/User/Username/'+Data['Username'];
        }
        else if(Data['Email'])
        {
            URL = '/User/Email/'+Data['Email'];
        }
        else
        {
            URL = '/User/Self';
        }
    }
    else if(Section=='Get')
    {
        Method = 'GET';
        if(Data['Username'])
        {
            URL = '/User/Username/'+Data['Username'];
        }
        else if(Data['Email'])
        {
            URL = '/User/Email/'+Data['Email'];
        }
        else
        {
            URL = '/User/Self';
        }
    }
    else if(Section=='GetSession')
    {
        Method = 'GET';
        URL = '/Session/User';
    }
    else if(Section=='Elevate')
    {
        Method = 'POST';
        URL = '/User/Self/Memberships/Admin';
    }
    
    var Options = {'cache': false, 'type': Method};
    if(Data && (Method!='GET'))
    {
        Options['data']=JSON.stringify(Data);
        Options['dataType']='json';
        Options['contentType'] = 'application/json; charset=UTF-8';
    }
    
    jQuery.ajax(URL, Options).done(function(Data, TextStatus, XHR) {
        var Content = "";
        Content+='<p>Status: '+XHR.status+'</p>';
        Content+='<p>Data: '+JSON.stringify(Data)+'</p>';
        jQuery('output').html(Content);
    }).fail(function(XHR, TextStatus, Error) {
        var Content = "";
        Content+='<p>Status: '+XHR.status+'</p>';
        jQuery('output').html(Content);
    });
}

jQuery('body').on('click', 'button', function(Event) {
    Event.preventDefault();
    var Section = jQuery(this).closest('section');
    Section.children('form').Send();
});

