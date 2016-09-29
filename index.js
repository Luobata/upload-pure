var url = require('url');
var fs = require('fs');
var http = require('http');

var upload = function (file, uploadUrl, callback) {
    var uploadConfig = {
        host: url.parse(uploadUrl).hostname,
        port: url.parse(uploadUrl).port || 80,
        path: url.parse(uploadUrl).pathname,
        method: 'POST'
    };

    var blockReq = function (fileKeyValue, req) {
        var boundaryKey = Math.random().toString(16);
        var enddata = '\r\n----' + boundaryKey + '--';
        var files = new Array();

        for (var i = 0; i < fileKeyValue.length; i++) {
            var content = "\r\n----" + boundaryKey + "\r\n" +
                "Content-Type: multipart/form-data\r\n" +
                "Content-Disposition: form-data; name=\"" +
                fileKeyValue[i].urlKey + "\"; filename=\"" +
                path.basename(fileKeyValue[i].urlValue) + "\"\r\n" +
                "Content-Transfer-Encoding: binary\r\n\r\n";
            var contentBinary = new Buffer(content, 'utf-8');
            files.push({
                contentBinary: contentBinary,
                filePath: fileKeyValue[i].urlValue
            });
        }
        var contentLength = 0;
        for (var i = 0; i < files.length; i++) {
            var stat = fs.statSync(files[i].filePath);
            contentLength += files[i].contentBinary.length;
            contentLength += stat.size;
        }
        req.setHeader('Content-Type', 'multipart/form-data; boundary=--' + boundaryKey);
        req.setHeader('Content-Length', contentLength + Buffer.byteLength(enddata));
        var fileIndex = 0;
        postFile(fileIndex, req, boundaryKey, files);
    }
    var postFile = function (fileIndex, req, boundaryKey, files) {
        req.write(files[fileIndex].contentBinary);
        var fileStream = fs.createReadStream(files[fileIndex].filePath, {
            bufferSize: 4 * 1024
        });
        fileStream.pipe(req, {
            end: false
        });
        fileStream.on('end', function() {
            fileIndex++;
            if (fileIndex == files.length) {
                var enddata = '\r\n----' + boundaryKey + '--';
                req.end(enddata);
            } else {
                postFile(fileIndex, req, boundaryKey, files);
            }
        });
    }
    var init  = function (options, fileKeyValue, callback) {
        var url;
        var req = http.request(options, function(res) {
            //console.log('RES:' + res);
            //console.log('STATUS: ' + res.statusCode);
            //console.log('HEADERS: ' + JSON.stringify(res.headers));
            res.setEncoding('utf8');
            res.on("data", function(chunk) {
                //console.log('BODY:' + chunk);
                callback();
            });
        });
        req.on('error', function(e) {
            console.log('problem with request:' + e.message);
        });
        blockReq(fileKeyValue, req);
    }
    init(uploadConfig, file, callback);
};

module.exports = upload;
