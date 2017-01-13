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
    return callback(null, rendered)
  })
});
app.set('views', path.join(__dirname, '/views'));
app.set('view engine', 'html')

var md = require('markdown-it')();
var mk = require('markdown-it-katex');
md.use(mk);

app.get('/', function(req, res){
    var result = md.render('#title');
    res.render('template', { main: result })
});

app.get('/:entry', function(req, res){
    var filename = req.params.entry+'.md';
    console.log('open %s', filename);
    fs.readFile(path.join(__dirname, filename), 'utf8', function (err, data) {
        if (err) {
            res.render('template', { main: '404 Not Found' });
            return console.log(err);
        }
        res.render('template', { main: md.render(data) });
    });
});

http.listen(3000, function(){
    console.log('listening on *:3000');
});
