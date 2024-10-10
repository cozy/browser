/* ===============================================================================

Expose en local des pages web avec des cas de tests de formulaires pour Cozy Pass
url: http://localhost:3333/

=================================================================================== */

var http = require('http')
var fs   = require('fs'  )

http.createServer(function (req, res){

    var filePath = '.' + req.url
    if (filePath === './') {
        filePath = 'index.html'
    }

    if (!fs.existsSync(filePath)) {
        console.log("file doesnt exist", filePath);
        res.writeHead(404, {'Content-Type': 'text/plain'})
        res.write('404 Not Found\n');
        res.end();
        return
    }

    console.log("request of file :", filePath);
    // res.writeHead(200, {'Content-Type': 'text/html'})
    res.end(fs.readFileSync(filePath))

}).listen(3333);

console.log('server listening http://localhost:3333/');
