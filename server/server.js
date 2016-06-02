const express = require('express');
const redis = require('redis');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();
const PORT = 3210;
const PUBLIC = __dirname + '/../dist';
const PUBLIC_BRAIN = __dirname + '/../brain';

app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.text({limit: '50mb'}));
app.use('/', express.static( PUBLIC ));

app.use('/brain', express.static( PUBLIC_BRAIN, {
    setHeaders: function (res, path, stat) {
      res.set('Access-Control-Allow-Origin', '*');
    }
  }));

app.use('/memory', function(req, res, next) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});
app.use('/goodpainting', function(req, res, next) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.get('/', function (req, res) {
  res.sendFile(`${PUBLIC}/index.html`);
});
app.post('/memory', function (req, res) {
  //console.log(JSON.stringify(req.body));
  fs.writeFile('brain/brain.json', JSON.stringify(req.body), (err) => {
    if (err) throw err;
    console.log('Brain Has Been Saved', JSON.stringify(req.body).length);
  });
  res.send(req.body);
});
app.post('/goodpainting', function (req, res) {
  console.log('Saved Pic:', req.body.length);
  var base64Data = req.body.replace(/^data:image\/png;base64,/, "");

  fs.writeFile('brain/saved-'+Math.floor(Math.random()*100)+'.png', base64Data, 'base64', function(err) {
    res.json( ({ "saved": req.body.length }) );
    console.log(err);
  });
});

app.listen(PORT, function () {
  console.log(`Machine Learning server listening on ${PORT}!`);
});
