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

const GetVideoIntentHandler = {
  async canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "GetVideoIntent"
    );
  },
  handle(handlerInput) {
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

const NextPlaybackIntentHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);
    const request = handlerInput.requestEnvelope.request;

    return (
      playbackInfo.inPlaybackSession &&
      (request.type === "PlaybackController.NextCommandIssued" ||
        (request.type === "IntentRequest" &&
          request.intent.name === "AMAZON.NextIntent"))
    );
  },
  handle(handlerInput) {
    return controller.playNext(handlerInput);
  },
};

const PreviousPlaybackIntentHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);
    const request = handlerInput.requestEnvelope.request;

    return (
      playbackInfo.inPlaybackSession &&
      (request.type === "PlaybackController.PreviousCommandIssued" ||
        (request.type === "IntentRequest" &&
          request.intent.name === "AMAZON.PreviousIntent"))
    );
  },
  handle(handlerInput) {
    console.log("PreviousPlaybackHandler");
    return controller.playPrevious(handlerInput);
  },
};

const PausePlaybackIntentHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);
    const request = handlerInput.requestEnvelope.request;

    return (
      playbackInfo.inPlaybackSession &&
      request.type === "IntentRequest" &&
      (request.intent.name === "AMAZON.StopIntent" ||
        request.intent.name === "AMAZON.CancelIntent" ||
        request.intent.name === "AMAZON.PauseIntent")
    );
  },
  handle(handlerInput) {
    return controller.stop(handlerInput, "Pausing ");
  },
};

const ResumePlaybackIntentHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);
    const request = handlerInput.requestEnvelope.request;

    return (
      playbackInfo.inPlaybackSession &&
      request.type === "IntentRequest" &&
      (request.intent.name === "AMAZON.PlayIntent" ||
        request.intent.name === "AMAZON.ResumeIntent")
    );
  },
  handle(handlerInput) {
    return controller.play(handlerInput, "Resuming: ");
  },
};

const StartOverIntentHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);
    const request = handlerInput.requestEnvelope.request;

    return (
      playbackInfo.inPlaybackSession &&
      request.type === "IntentRequest" &&
      request.intent.name === "AMAZON.StartOverIntent"
    );
  },
  async handle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);

    playbackInfo.offsetInMilliseconds = 0;

    return controller.play(handlerInput, "Starting Over: ");
  },
};

const YesIntentHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);
    const request = handlerInput.requestEnvelope.request;

    return (
      !playbackInfo.inPlaybackSession &&
      request.type === "IntentRequest" &&
      request.intent.name === "AMAZON.YesIntent"
    );
  },
  handle(handlerInput) {
    return controller.play(handlerInput, "OK, Resuming: ");
  },
};

const NoIntentHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);
    const request = handlerInput.requestEnvelope.request;

    return (
      !playbackInfo.inPlaybackSession &&
      request.type === "IntentRequest" &&
      request.intent.name === "AMAZON.NoIntent"
    );
  },
  async handle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);

    playbackInfo.index = 0;
    playbackInfo.offsetInMilliseconds = 0;
    playbackInfo.playbackIndexChanged = true;
    playbackInfo.hasPreviousPlaybackSession = false;

    return controller.play(handlerInput, "OK, Starting Over: ");
  },
};



const HelpIntentHandler = {
  canHandle(handlerInput) {
    return (
      handlerInput.requestEnvelope.request.type === "IntentRequest" &&
      handlerInput.requestEnvelope.request.intent.name === "AMAZON.HelpIntent"
    );
  },
  async handle(handlerInput) {
    console.log("HelpHandler");
    const playbackInfo = await getPlaybackInfo(handlerInput);
    let message;

    if (!playbackInfo.hasPreviousPlaybackSession) {
      message = "Welcome to the Heytube. You can say, play video to begin.";
    } else if (!playbackInfo.inPlaybackSession) {
      message = `You were listening to ${
        constants.audioData[playbackInfo.index].snippet.title
      }. Would you like to resume?`;
    } else {
      message =
        "You are listening to Heytube. You can say, Next or Previous to navigate through the playlist. At any time, you can say Pause to pause the audio and Resume to resume.";
    }

    return handlerInput.responseBuilder
      .speak(message)
      .reprompt(message)
      .getResponse();
  },
};

const ExitIntentHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);
    const request = handlerInput.requestEnvelope.request;

    return (
      !playbackInfo.inPlaybackSession &&
      request.type === "IntentRequest" &&
      (request.intent.name === "AMAZON.StopIntent" ||
        request.intent.name === "AMAZON.CancelIntent")
    );
  },
  handle(handlerInput) {
    console.log("ExitHandler");
    return handlerInput.responseBuilder.speak("Goodbye!").getResponse();
  },
};

/* AUDIO HANDLERS */

/**
 * Handle Audio Player Events
 */
const AudioPlayerEventHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type.startsWith("AudioPlayer.");
  },
  async handle(handlerInput) {
    const { requestEnvelope, responseBuilder } = handlerInput;
    const audioPlayerEventName = requestEnvelope.request.type.split(".")[1];
    const playbackInfo = await getPlaybackInfo(handlerInput);
    console.log("AudioPlayerEventHandler");
    console.log(audioPlayerEventName);
    switch (audioPlayerEventName) {
      case "PlaybackStarted":
        playbackInfo.token = getToken(handlerInput);
        playbackInfo.index = await getIndex(handlerInput);
        playbackInfo.inPlaybackSession = true;
        playbackInfo.hasPreviousPlaybackSession = true;
        break;
      case "PlaybackFinished":
        playbackInfo.inPlaybackSession = false;
        playbackInfo.hasPreviousPlaybackSession = false;
        playbackInfo.nextStreamEnqueued = false;
        //increase audio index
        await setNextIndex(playbackInfo);
        break;
      case "PlaybackStopped":
        playbackInfo.token = getToken(handlerInput);
        playbackInfo.index = await getIndex(handlerInput);
        playbackInfo.offsetInMilliseconds = getOffsetInMilliseconds(
          handlerInput
        );
        break;
      case "PlaybackNearlyFinished": {
        if (playbackInfo.nextStreamEnqueued) {
          break;
        }
        const audio = playbackInfo.playOrder[playbackInfo.index];
        if (audio === undefined) {
          playbackInfo.nextStreamEnqueued = false;
          return controller.search(
            handlerInput,
            playbackInfo.query,
            playbackInfo.nextPageToken
          );
        } else {
          const { url, token } = await getNextAudioUrl(handlerInput);
          const expectedPreviousToken = playbackInfo.token;
          const offsetInMilliseconds = 0;
          const playBehavior = "ENQUEUE";
          playbackInfo.nextStreamEnqueued = true;

          responseBuilder.addAudioPlayerPlayDirective(
            playBehavior,
            url,
            token,
            offsetInMilliseconds,
            expectedPreviousToken
          );
          break;
        }
      }
      case "PlaybackFailed":
        playbackInfo.inPlaybackSession = false;
        console.log(
          "Playback Failed : %j",
          handlerInput.requestEnvelope.request.error
        );
        return;
      default:
        throw new Error("Should never reach here!");
    }

    return responseBuilder.getResponse();
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
    const playBehavior = "REPLACE_ALL";
    console.log("play");
    const audioUrl = await getAudioUrl(audioInfo.id);
    console.log(audioUrl);
    console.log(audioInfo.title);
    responseBuilder
      .speak(`Playing  ${audioInfo.title}`)
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
  async stop(handlerInput, message) {
    return handlerInput.responseBuilder
      .speak(message)
      .addAudioPlayerStopDirective()
      .getResponse();
  },
  async playNext(handlerInput) {
    const {
      playbackInfo,
    } = await handlerInput.attributesManager.getPersistentAttributes();
    console.log("PlayNext");
    playbackInfo.index = await setNextIndex(playbackInfo);
    playbackInfo.offsetInMilliseconds = 0;
    playbackInfo.playbackIndexChanged = true;
    return this.play(handlerInput, "Playing Next: ");
  },
  async playPrevious(handlerInput) {
    const {
      playbackInfo,
    } = await handlerInput.attributesManager.getPersistentAttributes();

    let previousIndex = playbackInfo.index - 1;

    if (previousIndex === -1) {
      return handlerInput.responseBuilder
        .speak("You have reached the start of the playlist")
        .addAudioPlayerStopDirective()
        .getResponse();
    }

    playbackInfo.index = previousIndex;
    playbackInfo.offsetInMilliseconds = 0;
    playbackInfo.playbackIndexChanged = true;

    return this.play(handlerInput, "Playing Previous: ");
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





const getToken = (handlerInput) => {
  // Extracting token received in the request.
  return handlerInput.requestEnvelope.request.token;
};

async function getIndex(handlerInput) {
  const attributes = await handlerInput.attributesManager.getPersistentAttributes();
  return attributes.playbackInfo.index;
}

async function setNextIndex(playbackInfo) {
  playbackInfo.index = playbackInfo.index + 1;
}

const getOffsetInMilliseconds = (handlerInput) => {
  // Extracting offsetInMilliseconds received in the request.
  return handlerInput.requestEnvelope.request.offsetInMilliseconds;
};

// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    CheckAudioInterfaceHandler,
    LaunchRequestHandler,
    GetVideoIntentHandler,
    YesIntentHandler,
    NoIntentHandler,
    NextPlaybackIntentHandler,
    PreviousPlaybackIntentHandler,
    PausePlaybackIntentHandler,
    ResumePlaybackIntentHandler,
    LoopOnIntentHandler,
    LoopOffIntentHandler,
    StartOverIntentHandler,
    SystemExceptionHandler,
    HelpIntentHandler,
    ExitIntentHandler,
    SessionEndedRequestHandler
  )
  .addRequestInterceptors(LoadPersistentAttributesRequestInterceptor)
  .addResponseInterceptors(SavePersistentAttributesResponseInterceptor)
  .addErrorHandlers(ErrorHandler)
  .withAutoCreateTable(true)
  .withTableName(constants.config.dynamoDBTableName)
  .lambda();
