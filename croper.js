var sharp = require('sharp');
var path = require('path');
var fs = require('fs');

function crop(p, handler) {
	var s = sharp(p);
	var newPath = path.join(path.dirname(p), 'extracted-' + path.basename(p));
	var del = function(h){
		fs.unlink(newPath, h);
	}

	s.toBuffer((err, buf, info) => {
		if (err) return handler(err, null, null);

		s.extract({
			left: 0,
			top: 0,
			width: info.width,
			height: 50
		}).toFile(newPath, err => {
			if (err) return handler(err, null, null);

			handler(null, newPath, del);
		});
	});
}

module.exports.crop = crop;