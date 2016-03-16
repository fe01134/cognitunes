/**
    Copyright 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.

    Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

        http://aws.amazon.com/apache2.0/

    or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/

/**
 * App ID for the skill
 */
var APP_ID = undefined;//replace with 'amzn1.echo-sdk-ams.app.[your-unique-value-here]';

var https = require('https');

/**
 * The AlexaSkill prototype and helper functions
 */
var AlexaSkill = require('./AlexaSkill');

/**
 * Cognitunes is a child of AlexaSkill.
 * To read more about inheritance in JavaScript, see the link below.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Introduction_to_Object-Oriented_JavaScript#Inheritance
 */
var Cognitunes = function () {
    AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
Cognitunes.prototype = Object.create(AlexaSkill.prototype);
Cognitunes.prototype.constructor = Cognitunes;

// ----------------------- Override AlexaSkill request and intent handlers -----------------------

Cognitunes.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("onSessionStarted requestId: " + sessionStartedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any initialization logic goes here
};

Cognitunes.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    var speechOutput = {
        speech: "Welcome to Cognitunes. What's happening?",
        type: AlexaSkill.speechOutputType.PLAIN_TEXT
    };
    var repromptOutput = {
        speech: "Tell me what's going on with you, and I can play some music.",
        type: AlexaSkill.speechOutputType.PLAIN_TEXT
    };
    response.ask(speechOutput, repromptOutput)
};

Cognitunes.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("onSessionEnded requestId: " + sessionEndedRequest.requestId
        + ", sessionId: " + session.sessionId);
    // any cleanup logic goes here
};

/**
 * override intentHandlers to map intent handling functions.
 */
Cognitunes.prototype.intentHandlers = {
    "DialogIntent": function (intent, session, response) {
        var phraseSlot = intent.slots.Phrase;
        if (phraseSlot && phraseSlot.value) {
            handlePhraseDialogRequest(intent, session, response);
        } else {
            handleNoSlotDialogRequest(intent, session, response);
        }
    },

    "AMAZON.HelpIntent": function (intent, session, response) {
        response.tell("I didn't understand you, just try telling me what's going on.");
        // handleHelpRequest(response);
    },

    "AMAZON.StopIntent": function (intent, session, response) {
        var speechOutput = "Goodbye";
        response.tell(speechOutput);
    },

    "AMAZON.CancelIntent": function (intent, session, response) {
        var speechOutput = "Goodbye";
        response.tell(speechOutput);
    }
};

// -------------------------- Cognitunes Domain Specific Business Logic --------------------------

// example city to NOAA station mapping. Can be found on: http://tidesandcurrents.noaa.gov/map/
var EMOTION_URLS = {
    'joy': [
        "https://s3.amazonaws.com/bean-mrjob/theweeknd.mp3"
    ],
    'anger': ["https://s3.amazonaws.com/bean-mrjob/anger.mp3"],
    'fear': ["https://s3.amazonaws.com/bean-mrjob/fear.mp3"],
    'disgust': ["https://s3.amazonaws.com/bean-mrjob/disgust.mp3"],
    'sadness': ["https://s3.amazonaws.com/bean-mrjob/sadness.mp3"]
};

var EMOTION_NAMES = {
    'joy': 'happy',
    'anger': 'angry',
    'fear': 'soothing',
    'disgust': 'soothing',
    'sadness': 'sad'
};



function handlePhraseDialogRequest(intent, session, response) {
    var phrase = intent.slots.Phrase;
    var speechOutput;

    getEmotionForPhrase(phrase.value, function(emotion, error) {
        if (error) {
            speechOutput = {
                speech: "Sorry, my friend IBM Watson is experiencing issues. Please try again.",
                type: AlexaSkill.speechOutputType.PLAIN_TEXT
            };
        } else {
            var src = EMOTION_URLS[emotion][0];
            var adjective = EMOTION_NAMES[emotion];
            speechOutput = {
                speech: "<speak>Playing " + adjective + " music. <audio src='" + src + "'/></speak>",
                type: AlexaSkill.speechOutputType.SSML
            };
        }
        console.log('speechOutput: ' + JSON.stringify(speechOutput));
        response.tell(speechOutput, "Cognitunes", speechOutput);
    });
}

function getEmotionForPhrase(phrase, emotionResponseCallback) {
    var endpoint = "https://qb54apltkl.execute-api.us-east-1.amazonaws.com/prod/alchemy-emotions/";
    var url = endpoint + "?phrase=" + phrase;

    var emotionString = '';
    console.log('URL: ' + url);
    https.get(url, function(res) {
        res.on('data', function(data) {
            console.log('on data - data: ' + data);
            emotionString += data;
        });

        res.on('end', function() {
            console.log('on end -  emotionString: ' + emotionString);
            var emotionObj = JSON.parse(emotionString);
            emotionResponseCallback(emotionObj.emotion, null);
        });
    }).on('error', function(err) {
        console.log('Get emotions for phrase error: ' + err.message);
        emotionResponseCallback(null, err.message);
    });
}

/**
 * Handle no slots, or slot(s) with no values.
 * In the case of a dialog based skill with multiple slots,
 * when passed a slot with no value, we cannot have confidence
 * it is the correct slot type so we rely on session state to
 * determine the next turn in the dialog, and reprompt.
 */
function handleNoSlotDialogRequest(intent, session, response) {
    var speechOutput = "What's going on with you?";
    var repromptText = "Please try again, let me know how you're doing, "
        + "so I can customize your music for you";
    response.ask(speechOutput);
}


// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    var cognitunes = new Cognitunes();
    cognitunes.execute(event, context);
};
