var tesseract = require('node-tesseract');

function process(path, handler){
	tesseract.process(path, (err, text) => {
		if (err) return handler(err, null);

		var firstln = text.split('\n')[0];
		var matchAry = /\d+(?:\.\d+)?%/g.exec(firstln);
		
		if (!matchAry || matchAry.length === 0){
			return handler(null, null);
		}
		handler(null, matchAry[matchAry.length - 1]);
	});
}

module.exports.process = process;