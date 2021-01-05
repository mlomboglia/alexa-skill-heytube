const Alexa = require("ask-sdk");
const search = require("youtube-search");
const ytdl = require("ytdl-core");
const constants = require("./constants");

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
    const reprompt = "You can say, play the Whitesnake, to begin.";
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
          "AMAZON.StopIntent" ||
        Alexa.getIntentName(handlerInput.requestEnvelope) ===
          "AMAZON.PauseIntent")
    );
  },
  handle(handlerInput) {
    console.log("CancelAndStopIntentHandler");
    return controller.stop(handlerInput, "Goodbye!");
  },
};

const LoopOnIntentHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);

    return (
      playbackInfo.inPlaybackSession &&
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) ===
        "AMAZON.LoopOnIntent"
    );
  },
  async handle(handlerInput) {
    const playbackSetting = await getPlaybackSetting(handlerInput);
    playbackSetting.loop = true;

    return handlerInput.responseBuilder.speak("Loop turned on.").getResponse();
  },
};

const LoopOffIntentHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);

    return (
      playbackInfo.inPlaybackSession &&
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) ===
        "AMAZON.LoopOffIntent"
    );
  },
  async handle(handlerInput) {
    const playbackSetting = await getPlaybackSetting(handlerInput);
    playbackSetting.loop = false;

    return handlerInput.responseBuilder.speak("Loop turned off.").getResponse();
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
      .speak(message)
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
    const playbackInfo = await getPlaybackInfo(handlerInput);
    const playBehavior = "REPLACE_ALL";
    console.log("play");
    const formats = await getAudioUrl(audioInfo.id);
    console.log(formats.url);
    console.log(audioInfo.title);
    responseBuilder
      .speak(`Playing  ${audioInfo.title}`)
      .withShouldEndSession(true)
      .addAudioPlayerPlayDirective(
        playBehavior,
        formats.url,
        audioInfo.id,
        playbackInfo.offsetInMilliseconds,
        null
      );
    return responseBuilder.getResponse();
  },
  async stop(handlerInput, message) {
    return handlerInput.responseBuilder
      .speak(message)
      .addAudioPlayerStopDirective()
      .getResponse();
  },
};

const getAudioInfo = (query) => {
  return new Promise((resolve, reject) => {
    var opts = {
      maxResults: 1,
      key: process.env.YOUTUBE_API_KEY,
      part: "id,snippet",
      type: "video",
    };

    search(query, opts, function (err, results) {
      if (err) {
        console.log(err);
        reject(err);
      }
      console.log(results);
      resolve(results);
    });
  });
};

const getAudioUrl = async (videoId) => {
  const info = await ytdl.getInfo(videoId, {});
  const format = await ytdl.chooseFormat(info.formats, { quality: "140" });
  return format;
};

const getPlaybackInfo = async (handlerInput) => {
  const attributes = await handlerInput.attributesManager.getPersistentAttributes();
  return attributes.playbackInfo;
};

const getPlaybackSetting = async (handlerInput) => {
  const attributes = await handlerInput.attributesManager.getPersistentAttributes();
  return attributes.playbackSetting;
};

/* INTERCEPTORS */

const LoadPersistentAttributesRequestInterceptor = {
  async process(handlerInput) {
    const persistentAttributes = await handlerInput.attributesManager.getPersistentAttributes();

    // Check if user is invoking the skill the first time and initialize preset values
    if (Object.keys(persistentAttributes).length === 0) {
      handlerInput.attributesManager.setPersistentAttributes({
        playbackSetting: {
          loop: false,
        },
        playbackInfo: {
          playOrder: [],
          index: 0,
          offsetInMilliseconds: 0,
          playbackIndexChanged: true,
          token: "",
          nextStreamEnqueued: false,
          inPlaybackSession: false,
          hasPreviousPlaybackSession: false,
          query: "",
          nextPageToken: "",
        },
      });
    }
  },
};

const SavePersistentAttributesResponseInterceptor = {
  async process(handlerInput) {
    await handlerInput.attributesManager.savePersistentAttributes();
  },
};

// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.standard()
  .addRequestHandlers(
    CheckAudioInterfaceHandler,
    LaunchRequestHandler,
    GetVideoIntentHandler,
    SystemExceptionHandler,
    HelpIntentHandler,
    LoopOnIntentHandler,
    LoopOffIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addRequestInterceptors(LoadPersistentAttributesRequestInterceptor)
  .addResponseInterceptors(SavePersistentAttributesResponseInterceptor)
  .addErrorHandlers(ErrorHandler)
  .withAutoCreateTable(true)
  .withTableName(constants.config.dynamoDBTableName)
  .lambda();
