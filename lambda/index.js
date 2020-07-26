const Alexa = require("ask-sdk");
const search = require("youtube-search");
const ytdl = require("ytdl-core");

/* INTENT HANDLERS */

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "LaunchRequest"
    );
  },
  handle(handlerInput) {
    console.log("LaunchRequestHandler");
    const message =
      "Welcome to Hey Tube. ask to play a video to start listening.";
    const reprompt = "You can say, play the Beatles, to begin.";
    return handlerInput.responseBuilder
      .speak(message)
      .reprompt(reprompt)
      .getResponse();
  },
};

const CheckAudioInterfaceHandler = {
  async canHandle(handlerInput) {
    const audioPlayerInterface = (
      (((handlerInput.requestEnvelope.context || {}).System || {}).device || {})
        .supportedInterfaces || {}
    ).AudioPlayer;
    return audioPlayerInterface === undefined;
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak("Sorry, this skill is not supported on this device")
      .withShouldEndSession(true)
      .getResponse();
  },
};

const GetVideoIntentHandler = {
  async canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "GetVideoIntent"
    );
  },
  handle(handlerInput) {
    console.log("GetVideo");
    const speechText =
      handlerInput.requestEnvelope.request.intent.slots.videoQuery.value;
    if (speechText) {
      return controller.search(handlerInput, speechText);
    } else {
      return handlerInput.responseBuilder
        .speak("You can say, play the Beatles, to begin.")
        .getResponse();
    }
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.HelpIntent"
    );
  },
  handle(handlerInput) {
    const speakOutput =
      "Welcome to the Mytube. You can say, play video to begin.";

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};
const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      (Alexa.getIntentName(handlerInput.requestEnvelope) ===
        "AMAZON.CancelIntent" ||
        Alexa.getIntentName(handlerInput.requestEnvelope) ===
          "AMAZON.StopIntent")
    );
  },
  handle(handlerInput) {
    console.log("CancelAndStopIntentHandler");
    return controller.stop(handlerInput, "Goodbye!");
    //handle(handlerInput) {
    //const speakOutput = "Goodbye!";
    //return handlerInput.responseBuilder.speak(speakOutput).getResponse();
  },
};
const SystemExceptionHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type ===
      "System.ExceptionEncountered"
    );
  },
  handle(handlerInput) {
    console.log("SystemExceptionHandler");
    console.log(JSON.stringify(handlerInput.requestEnvelope, null, 2));
    console.log(
      `System exception encountered: ${handlerInput.requestEnvelope.request.reason}`
    );
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) ===
      "SessionEndedRequest"
    );
  },
  handle(handlerInput) {
    console.log("SessionEndedRequestHandler");
    // Any cleanup logic goes here.
    return handlerInput.responseBuilder.getResponse();
  },
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log("ErrorHandler");
    console.log(error);
    console.log(`Error handled: ${error.message}`);
    const message =
      "Sorry, this is not a valid command. Please say help to hear what you can say.";

    return handlerInput.responseBuilder
      .speak(Alexa.escapeXmlCharacters(message))
      .reprompt(message)
      .getResponse();
  },
};

/* HELPER FUNCTIONS */

const controller = {
  async search(handlerInput, query) {
    console.log(query);
    const data = await getAudioInfo(query);
    return this.play(handlerInput, data[0]);
  },
  async play(handlerInput, audioInfo) {
    const { responseBuilder } = handlerInput;
    const playBehavior = "REPLACE_ALL";
    console.log("play");
    const audioUrl = await getAudioUrl(audioInfo.id);
    console.log(audioUrl);
    console.log(audioInfo.title);
    responseBuilder
      .speak(Alexa.escapeXmlCharacters(`Playing  ${audioInfo.title}`))
      .withShouldEndSession(true)
      .addAudioPlayerPlayDirective(
        playBehavior,
        audioUrl,
        audioInfo.id,
        0,
        null
      );
    return responseBuilder.getResponse();
  },
  stop(handlerInput, message) {
    return handlerInput.responseBuilder
      .speak(Alexa.escapeXmlCharacters(message))
      .addAudioPlayerStopDirective()
      .getResponse();
  },
};

const getAudioInfo = (query) => {
  return new Promise((resolve, reject) => {
    var opts = {
      maxResults: 1,
      key: "key",
      part: "id,snippet",
      type: "video",
    };

    search(query, opts, function (err, results) {
      if (err) {
        reject(err);
      }
      resolve(results);
    });
  });
};

const getAudioUrl = (videoId) => {
  return new Promise((resolve, reject) => {
    console.log(videoId);
    ytdl.getInfo(videoId, (err, info) => {
      if (err) {
        console.log(err);
        reject(err);
      }
      console.log(info.formats);
      let format = ytdl.chooseFormat(info.formats, { quality: "140" });
      if (format) {
        console.log(format.url);
        resolve(format.url);
      } else {
        reject(err);
      }
    });
  });
};

// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    CheckAudioInterfaceHandler,
    LaunchRequestHandler,
    GetVideoIntentHandler,
    SystemExceptionHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
