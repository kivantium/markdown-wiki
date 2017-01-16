var express = require('express');
var app = express();
var http = require('http').Server(app);
var fs = require('fs')
var path = require('path');

app.use(express.static(__dirname + '/public'));
app.engine('html', function (filePath, options, callback) {
  fs.readFile(filePath, 'utf8', function (err, content) {
    if (err) return callback(err)
    var rendered = content.toString().replace('#main#', options.main)
                                     .replace('#title#', options.title);
    return callback(null, rendered)
  })
});
app.set('views', path.join(__dirname, '/views'));
app.set('view engine', 'html')

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
md.use(require('markdown-it-title'))

app.get('/', function(req, res){
    var result = md.render('# Tips');
    res.render('template', { main: result })
});

app.get('/favicon.ico', function(req, res) {
    res.sendStatus(204);
});

app.get('/:entry', function(req, res){
    var filename = req.params.entry+'.md';
    fs.readFile(path.join(__dirname, filename), 'utf8', function (err, data) {
        if (err) {
            res.render('template', { main: '404 Not Found' });
        } else {
            const env = {};
            var article = md.render(data, env);
            res.render('template', { main: article, title: env.title });
        }
    });
});

app.use(function(req, res){
    res.render('template', { main: 'File does not exist' });
});

http.listen(3000, function(){
    console.log('listening on *:3000');
});
