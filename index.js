'use strict';
var http = require('http');
var maxPage = 100;

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: 'PlainText',
            text: output,
        },
        card: {
            type: 'Simple',
            title: `${title}`,
            content: `${output}`,
        },
        reprompt: {
            outputSpeech: {
                type: 'PlainText',
                text: repromptText,
            },
        },
        shouldEndSession,
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: '1.0',
        sessionAttributes,
        response: speechletResponse,
    };
}

function startCooking(session, callback) {
    getJson(
        session, 
        function(results) {
            const cardTitle = "Let's Cook";
            const shouldEndSession = false;
            var speechOutput = "";
            var repromptText = "";
            if (!results) {
                speechOutput = "I was unable to find any recipes containing "
                    + session.attributes.ingredients.join(" ")
                    + " Try removing an ingredient.";
                repromptText = "Try saying, remove " + session.attributes.ingredients[0];
            } else if (results.length <= session.attributes.currentIndex) {
                speechOutput = "I was unable to find any more recipes containing "
                    + session.attributes.ingredients.join(" ")
                    + " Try removing an ingredient.";
                repromptText = "Try saying, remove " + session.attributes.ingredients[0];
            } else {
                var title = results[session.attributes.currentIndex].title.replace(/\n/g, '');
                session.attributes.lastResult = results;
                speechOutput = "Does " + title + " sound good?";
                repromptText = 'Or maybe you want to add an ingredient?';
            }
            const sessionAttributes = session.attributes;
            callback(sessionAttributes,
                buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
        }
    );
}

function startHelp(callback) {
    const sessionAttributes = {};
    const cardTitle = "Let's Cook";
    const speechOutput = "Are you looking around the kitchen wondering what you can make? "
        + "Ask me what can I make with cucumbers and beets. Toss in some chicken. "
        + "Nevermind the beets. And I'll make recipe suggestions.";
    const repromptText = "I'm getting hungry just thinking about it.";
    const shouldEndSession = false;
    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function sendRecipe(session, callback) {
    if (!session.attributes || 
        !session.attributes.lastResult || 
        !session.attributes.lastResult.length ||
        session.attributes.lastResult.length <= session.attributes.currentIndex
    ) {
        return startHelp(callback);
    }
    var currentRecipe = session.attributes.lastResult[session.attributes.currentIndex];
    const sessionAttributes = session.attributes;
    const speechOutput = "Open the Alexa app for a link to the recipe.";
    const repromptText = "";
    const shouldEndSession = true;
    var speechletResponse = buildSpeechletResponse(currentRecipe.title, speechOutput, repromptText, shouldEndSession);
    speechletResponse.card = {
        type: "Standard",
        title: currentRecipe.title,
        text: currentRecipe.href
    };
    callback(sessionAttributes, speechletResponse);
}

function nextRecipe(session, callback) {
    const cardTitle = "Let's Cook";
    const shouldEndSession = false;
    const sessionAttributes = session.attributes;
    var speechOutput, repromptText;
    if (!session.attributes || 
        !session.attributes.lastResult || 
        !session.attributes.lastResult.length
    ) {
        return startHelp(callback);
    } else if (session.attributes.lastResult.length <= session.attributes.currentIndex) {
        speechOutput = "I was unable to find any more recipes containing "
            + session.attributes.ingredients.join(" ")
            + " Try removing an ingredient.";
        repromptText = "Try saying, remove " + session.attributes.ingredients[0];
        return callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    }
    var nextRecipe = session.attributes.lastResult[session.attributes.currentIndex];
    var title = nextRecipe.title.replace(/\n/g, '');
    speechOutput = "Does " + title + " sound good?";
    repromptText = 'Or maybe you want to add an ingredient?';
    callback(sessionAttributes, 
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
    const cardTitle = "Let's Cook";
    const speechOutput = 'Bone app petite';
    const shouldEndSession = true;
    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}

function onSessionStarted(sessionStartedRequest, session) {
    console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);
}

function onLaunch(launchRequest, session, callback) {
    console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);    
    if (!session.attributes) {
        session.attributes = {};
    }
    if (!session.attributes.ingredients) {
        session.attributes.ingredients = [];
    }
    if (!session.attributes.currentIndex) {
        session.attributes.currentIndex = 0;
    }
    startCooking(session, callback);
}

function onIntent(intentRequest, session, callback) {
    console.log(`onIntent requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);

    const intent = intentRequest.intent;
    const intentName = intentRequest.intent.name;
    
    if (!session.attributes) {
        session.attributes = {};
    }
    if (!session.attributes.ingredients) {
        session.attributes.ingredients = [];
    }
    if (!session.attributes.currentIndex) {
        session.attributes.currentIndex = 0;
    }
    
    var newIngredientsList = [];
    if (intentName === 'NewIngredientIntent') {
        session.attributes.currentIndex = 0;
        if (intent.slots.ingredients && intent.slots.ingredients.value) {
            session.attributes.ingredients = intent.slots.ingredients.value.split(" ");
        } else {
            session.attributes.ingredients = [];
        }
        startCooking(session, callback);
    } else if (intentName === 'AddIngredientIntent') {
        session.attributes.currentIndex = 0;
        var ingredientsToAdd = intent.slots.ingredients;
        if (ingredientsToAdd.value) {
            var ingredientsToAddArray = ingredientsToAdd.value.split(" ");
            newIngredientsList = session.attributes.ingredients.concat(ingredientsToAddArray);
            newIngredientsList = newIngredientsList.filter(
                function(value, index, self) { 
                    return self.indexOf(value) === index;
                }
            );
            session.attributes.ingredients = newIngredientsList;
        }
        startCooking(session, callback);
    } else if (intentName === 'RemoveIngredientIntent') {
        session.attributes.currentIndex = 0;
        var ingredientsToRemove = intent.slots.ingredients;
        if (ingredientsToRemove.value) {
            var i;
            var ingredientsToRemoveArray = ingredientsToRemove.value.split(" ");
            for (i = 0; i < session.attributes.ingredients.length; i++) {
                if (ingredientsToRemoveArray.indexOf(session.attributes.ingredients[i]) === -1) {
                    newIngredientsList.push(session.attributes.ingredients[i]);
                }
            }
            session.attributes.ingredients = newIngredientsList;
        }
        startCooking(session, callback);
    } else if (intentName === 'AMAZON.YesIntent') {
        // send recipe to card
        sendRecipe(session, callback);
    } else if (intentName === 'AMAZON.NoIntent') {
        session.attributes.currentIndex++;
        // get read next suggestion
        nextRecipe(session, callback);
    } else if (intentName === 'AMAZON.HelpIntent') {
        startHelp(callback);
    } else if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent'|| intentName === 'AMAZON.NoIntent') {
        handleSessionEndRequest(callback);
    } else {
        throw new Error('Invalid intent');
    }
}

function onSessionEnded(sessionEndedRequest, session) {
    console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
    // Add cleanup logic here
}

function getJson(session, eventCallback) {
    var url = "http://www.recipepuppy.com/api/?i=";
    if (session.attributes.ingredients.length === 0) {
        var page = Math.random() * (maxPage - 1) + 1;
        url += "&p=" + page;
    }
    else {
        url += session.attributes.ingredients.join(',');
    }
    http.get(url, function(res) {
        var body = '';
        
        if (res.statusCode !== 200) {
            eventCallback(false);
            return;
        }
        
        res.on('data', function (chunk) {
            body += chunk;
        });

        res.on('end', function () {
            var result = JSON.parse(body);
            eventCallback(result.results);
        });
    }).on('error', function (e) {
        console.log("Got error: ", e);
    });
}

// --------------- Main handler -----------------------

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
    try {
        console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);

        if (event.session.application.applicationId !== 'INSERT-ID-HERE') {
             callback('Invalid Application ID');
        }

        if (event.session.new) {
            onSessionStarted({ requestId: event.request.requestId }, event.session);
        }

        if (event.request.type === 'LaunchRequest') {
            onLaunch(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'IntentRequest') {
            onIntent(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'SessionEndedRequest') {
            onSessionEnded(event.request, event.session);
            callback();
        }
    } catch (err) {
        callback(err);
    }
};
