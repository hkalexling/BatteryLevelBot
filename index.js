const tweet_interval_min = 15;
const threshold_battery = 20;
const threshold_aspect_ratio = 0.75;
const track_keywork = 'i';

var Twit = require('twit');
var request = require('request');
var fs = require('fs');
var os = require('os');
var path = require('path');
var uuid = require('uuid/v1');
var secret = require('./secret');
var ocr = require('./ocr');

var T = new Twit(secret.twitter);

var stream = T.stream('statuses/filter', {track: track_keywork});

var reply = null; // {id: '12345678', msg: 'Hello World!'}
setInterval(() => {
	if (reply === null) return;

	T.post('statuses/update', {
		status: reply.msg,
		in_reply_to_status_id: reply.id
	}, (err, data, response) => {
		reply = null;
		if (err) {
			console.log('failed to reply with error: ', err);
		}
		else{
			console.log('replied!');
		}
		console.log('reply: ', reply);
	});

}, 1000 * 60 * tweet_interval_min); // minimum tweet interval: 15min

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
				if (smallSize.w / smallSize.h < threshold_aspect_ratio){
					
					tempFile(m.media_url, (path, del) => {
						ocr.process(path, (err, percentage) => {
							del();
							if (err) {
								console.log('err: ', err);
							}
							if (percentage) {

								var num = parseInt(percentage.replace('%', ''));
								if (num <= threshold_battery){

									reply = getReply(tweet.id_str, num, tweet.user.screen_name);
									console.log('reply added: ', reply);

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

function getReply(id, num, name){
	var msgPool = [
		`@${name} Your phone has only ${num}% of battery left! Go Charge it! 😉`,
		`@${name} Hi there, remember to charge your phone! It has only ${num}% battery left! 🔋`,
		`@${name} 😇 Just a friendly reminder: your phone has only ${num}% battery left and needs to be charged!`
	];
	var msg = msgPool[Math.floor(Math.random() * msgPool.length)];
	return {id: id, msg: msg};
}