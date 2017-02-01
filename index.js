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
app.use(bodyParser.json());

app.use(express.static(__dirname + '/public'));
app.engine('ejs', ejs.renderFile);
app.set('views', path.join(__dirname, '/views'));
app.set('view engine', 'ejs')

var hljs = require('highlight.js')
var md = require('markdown-it')({
  html:         true,        // Enable HTML tags in source
  breaks:       true,        // Convert '\n' in paragraphs into <br>
  linkify:      true,        // Autoconvert URL-like text to links
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(lang, str).value;
      } catch (__) {}
    }
    return ''; // use external default escaping
  }
});
md.use(require('markdown-it-katex'));
md.use(require('markdown-it-title'));
md.use(require('markdown-it-deflist'));


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
    secret: 'keyboard alice',
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/', function(req, res){
    var profile_image;
    if(req.user) {
        username = req.user.username;
        profile_image = req.user.photos[0].value;
    }
    var filename = 'index';
    fs.readFile(path.join(__dirname, 'md/'+filename+'.md'), 'utf8', function (err, data) {
        const env = {};
        var article = md.render(data, env);
        res.render('template.ejs', { title: env.title,
                                     main: article,
                                     link: filename,
                                     profile_image: profile_image});
    });
});

app.get('/favicon.ico', function(req, res) {
    res.sendStatus(204);
});

app.get('/:entry', function(req, res){
    var profile_image;
    if(req.user) {
        username = req.user.username;
        profile_image = req.user.photos[0].value;
    }
    var filename = req.params.entry;
    fs.readFile(path.join(__dirname, 'md/'+filename+'.md'), 'utf8', function (err, data) {
        if (err) {
            res.render('template.ejs', { title: 'Page Not Found', 
                                         main: 'Page Not Found.', 
                                         link: filename,
                                         profile_image: profile_image});
        } else {
            const env = {};
            var article = md.render(data, env);
            res.render('template.ejs', { title: env.title,
                                         main: article,
                                         link: filename,
                                         profile_image: profile_image});
        }
    });
});

app.get('/edit/:entry', function(req, res){
    var profile_image;
    if(req.user) {
        username = req.user.username;
        profile_image = req.user.photos[0].value;
    }
    if(req.user && req.user.username == 'kivantium') {
        var filename = req.params.entry;
        fs.readFile(path.join(__dirname, 'md/'+filename+'.md'), 'utf8', function (err, data) {
            if (err) {
                res.render('edit.ejs', { title: filename,
                                         main: '', 
                                         link: filename,
                                         profile_image: profile_image});
            } else {
                res.render('edit.ejs', { title: filename,
                                         main: data, 
                                         link: filename,
                                         profile_image: profile_image});
            }
        });
    } else {
        res.redirect('/');
    }   
});

app.get('/login/twitter',
  passport.authenticate('twitter')
);

app.get('/login/twitter/callback', 
  passport.authenticate('twitter', { successRedirect:'/',
                                     failureRedirect: '/login/twitter',
                                     failureFlash: true })
);

app.post('/save', function(req, res) {
    var input = JSON.parse(JSON.stringify(req.body));
    fs.writeFile(path.join(__dirname, 'md/'+input['file']+'.md'), input['data']);
});

app.use(function(req, res){
    res.render('template', { main: 'File does not exist' });
});

http.listen(3000, function(){
    console.log('listening on *:3000');
});
