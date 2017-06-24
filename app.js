var express = require('express');
var app = express();
var http = require('http').Server(app);
var fs = require('fs')
var path = require('path');
var ejs = require('ejs');
var session = require('express-session')
var passport = require('passport');
var Strategy = require('passport-twitter').Strategy;
var bodyParser = require('body-parser');
var MongoClient = require('mongodb').MongoClient
var dateformat = require('dateformat');

// template engine configuration
app.use(express.static(__dirname + '/public'));
app.set('views', path.join(__dirname, '/views'));
app.set('view engine', 'ejs')

// markdown-it configuration
var md = require('markdown-it')({
    html:    true,
    breaks:  true,
    linkify: true
});
md.use(require('markdown-it-katex'));
md.use(require('markdown-it-highlightjs'));
md.use(require('markdown-it-title'));
md.use(require('markdown-it-deflist'));

// passport configuration
var config = fs.readFileSync("config.json");
var jsonConfig = JSON.parse(config);
passport.use(new Strategy({
    consumerKey: jsonConfig.consumerKey,
    consumerSecret: jsonConfig.consumerSecret,
    callbackURL: jsonConfig.callbackURL
},
function(token, tokenSecret, profile, cb) {
    return cb(null, profile);
}));

passport.serializeUser(function(user, cb) {
    cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
    cb(null, obj);
});

app.use(session({
    secret: jsonConfig.sessionSecret,
    resave: false,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

// miscellaneous configuration
app.use(bodyParser.urlencoded({ limit:'50mb', extended: false }));
app.use(bodyParser.json());

var db_url = 'mongodb://localhost:27017/wiki';

var openArticle = function(req, res, entry) {
    var profile_image;
    if(req.user) profile_image = req.user.photos[0].value;
    MongoClient.connect(db_url, function(err, db) {
        db.collection('article').findOne({'entry': entry}, function(err, data) {
            if(data) {
                var update_at = dateformat(data["update_at"], 'yyyy-mm-dd HH:MM');
                res.render('template.ejs', { 
                    entry: entry,
                    title: data["title"],
                    category: data["category"],
                    update_at: update_at,
                    main: data["html"],
                    profile_image: profile_image
                });
            } else {
                var update_at = dateformat(Date(), 'yyyy-mm-dd日 HH:MM');
                res.render('template.ejs', { 
                    entry: entry,
                    title: '404 Not Found',
                    category: "index",
                    update_at: update_at,
                    main: '404 Not Found',
                    profile_image: profile_image
                });
            }
        });
        db.close();
    });
};

var editArticle = function(req, res, entry) {
    var profile_image;
    if(req.user) profile_image = req.user.photos[0].value;
    if(entry == 'new') {
        res.render('edit.ejs', { 
            entry: undefined,
            category: undefined,
            title: 'new',
            main: '',
            profile_image: profile_image
        });
    } else {
        MongoClient.connect(db_url, function(err, db) {
            db.collection('article').findOne({'entry': entry}, function(err, data) {
                if(data) {
                    res.render('edit.ejs', { 
                        entry: entry,
                        category: data["category"],
                        title: data["title"],
                        main: data["markdown"],
                        profile_image: profile_image
                    });
                } else {
                    res.render('edit.ejs', { 
                        entry: entry,
                        category: undefined,
                        title: entry,
                        main: '',
                        profile_image: profile_image
                    });
                }
            });
            db.close();
        });
    }
};
app.get('/', function(req, res){
    openArticle(req, res, 'index');
});
app.get('/:entry', function(req, res){
    openArticle(req, res, req.params.entry);
});

app.get('/edit/:entry', function(req, res){
    if(req.user && req.user.username == 'kivantium') {
        editArticle(req, res, req.params.entry);
    } else {
        var profile_image;
        if(req.user) profile_image = req.user.photos[0].value;
        var update_at = dateformat(Date(), 'yyyy年mm月dd日 HH時MM分');
	res.render('template.ejs', { 
	    entry: '',
	    title: '403 Forbidden',
	    category: "index",
	    update_at: update_at,
	    main: '403 Forbidden',
	    profile_image: profile_image
	});
    }
});

app.post('/post',function(req,res){
    MongoClient.connect(db_url, function(err, db) {
        const env = {};
        var html = md.render(req.body.markdown, env);
        db.collection('article').updateOne(
            {entry: req.body.entry},
            {$set: {"update_at": new Date(),
                    "title": req.body.title,
                    "category": req.body.category,
                    "markdown": req.body.markdown,
                    "html": html,
                    "property": ""}},
            {upsert: true}
        );
        fs.writeFile(path.join(__dirname, 'md/'+req.body.entry+'.md'), req.body.markdown);
        db.close();
    });
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate, post-check=0, pre-check=0');
    res.redirect("/"+req.body.entry);
});

app.get('/login/twitter',
  passport.authenticate('twitter')
);

app.get('/login/twitter/callback', 
  passport.authenticate('twitter', { successRedirect:'/',
                                     failureRedirect: '/login/twitter',
                                     failureFlash: true })
);

http.listen(3000, function(){
    console.log('listening on *:3000');
});
