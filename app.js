//app.js


//----- START DEFINING CONSTANTS -----//
const yelpAPI = "mxrrKqYYGerISbDhOY5eredfrB81Yt32h4x4whGobVU4N5dFF9g16PCCenPAcY-Xh5LnbfH7ti8vyoZn7Op662Lv6qyCHmw7px8WKuZBIlN1A1ARsS-YGo1HtaK6XHYx";
const yelp = require('yelp-fusion');
const yelpClient =  yelp.client(yelpAPI);

const Twit = require('twit');
const dotenv = require('dotenv');
const Sentiment = require('sentiment');
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

dotenv.config();

const { CONSUMER_KEY
      , CONSUMER_SECRET
      , ACCESS_TOKEN
      , ACCESS_TOKEN_SECRET
      } = process.env;

const config_twitter = {
    consumer_key: CONSUMER_KEY,
    consumer_secret: CONSUMER_SECRET,
    access_token: ACCESS_TOKEN,
    access_token_secret: ACCESS_TOKEN_SECRET,
    timeout_ms: 60*1000
};

const twitter = new Twit(config_twitter);

//----- END DEFINING CONSTANTS -----//




async function main() {
    makeWebpage();
}


async function makeWebpage(){

    app.use(express.static(__dirname + '/public'));

    io.on('connection', function(socket){
        socket.on('newView', function(msg){
            getNewYelp(msg);
        });
        socket.on('getReviews', function(msg){
            getReviews(msg);
        });
    });

    const port = process.env.PORT || 3000;
    http.listen(port, function(){
        console.log('listening on *:3000');
    });
}


async function getNewYelp(info) {

    cLongitude = info.cLongitude;
    cLatitude = info.cLatitude;
    range = info.range;
    term = info.term;
    
    var lim = 50;    
    var off = 0;
    var totalBus = 1000;
    var busArray = [];

    while(off < totalBus){
        //creates the query
        const searchRequest = {
            term: term,
            latitude: cLatitude,
            longitude: cLongitude, 
            radius: range,
            limit: lim,
            offset: off
        }
        //send the query
        var response = await yelpClient.search(searchRequest);
        //sets total businesses into while loop
        totalBus = response.jsonBody.total;
        //puts businesses from query into the array
        for(busIndex in response.jsonBody.businesses){
            busArray.push(response.jsonBody.businesses[busIndex]);
        }
        //sets the new offset to total businesses queried
        off = off + lim;
    }
    //returns all businesses from all queries
    io.emit('updatedInfo',busArray);
}


async function getReviews(busInfo) {
    
    busName = busInfo.busName;
    busID = busInfo.busID;

    yelpClient.reviews(busID).then(response => {
        io.emit('showReviews', response.jsonBody.reviews);
    })

    getSentiment(busName);
}



async function getSentiment(busName){

    let tweets = await twitter.get('search/tweets', {q: busName, count: 10});

    var sentiment = new Sentiment();

    var tweetSentiment = 0;

    for (tweet of tweets.data.statuses) {
        let score = sentiment.analyze(tweet.text).comparative;
        tweetSentiment = tweetSentiment + score;
    }

    var scoreAverage = (tweetSentiment/tweets.data.statuses.length);
    var starRating = 5*scoreAverage/2 + 2.5;

    twitterInfo = {
        tweets: tweets.data.statuses,
        rating: starRating
    }

    io.emit('showTweets', twitterInfo);
}


main();
