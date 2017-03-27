var Twit = require('twit');
var request = require('request');
var fs = require('fs');
var os = require('os');
var path = require('path');
var uuid = require('uuid/v1');
var secret = require('./secret');
var ocr = require('./ocr');

var T = new Twit(secret.twitter);

var stream = T.stream('statuses/filter', {track: 'i'});

stream.on('connect', req => {
	console.log('stream connecting');
});
stream.on('disconnect', msg => {
	console.log('stream disconnected. ', msg);
});
stream.on('reconnect', (reconn, res, interval) => {
	console.log('reconnecting. statusCode:', res.statusCode)
});
stream.on('tweet', tweet => {

	var media = tweet.entities.media;

	if (tweet.quoted_status){
		return;
	}
	if (tweet.retweeted_status) {
		return;
	}

	if (media){
		media.forEach(m => {
			if (m.type === 'photo'){
				var smallSize = m.sizes.small;
				if (smallSize.w / smallSize.h < 0.75){
					
					tempFile(m.media_url, (path, del) => {
						ocr.process(path, (err, percentage) => {
							del();
							if (err) {
								console.log('err: ', err);
							}
							if (percentage) {
								var num = parseInt(percentage.replace('%', ''));
								if (num <= 20){

									T.post('statuses/update', {
										status: `@${tweet.user.screen_name} Your phone has only ${num}% of battery left! Go charge it! :D`,
										in_reply_to_status_id: tweet.id_str
									}, (err, data, response) => {
										if (err) {
											console.log('failed to reply with error: ', err);
										}
										else{
											console.log('replied!');
										}
									});

								}
							}
						});
					});

				}
			}
		});
	}

});

function tempFile(url, handler){
	var savePath = path.join(os.tmpdir(), uuid());
	var writeStream = fs.createWriteStream(savePath);
	var del = function(){
		fs.unlink(savePath);
	}
	request(url).pipe(writeStream).on('close', () => {
		handler(savePath, del);
	});
}