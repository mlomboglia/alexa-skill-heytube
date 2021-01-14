const Alexa = require("ask-sdk");
const ytdl = require("ytdl-core");
const ytlist = require("yt-list");

const constants = require("./constants");

/* INTENT HANDLERS */

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "LaunchRequest"
    );
  },
  async handle(handlerInput) {
    console.log("LaunchRequestHandler");
    const playbackInfo = await getPlaybackInfo(handlerInput);
    let message =
      "Welcome to Hey Tube. ask to play a video to start listening.";
    let reprompt = "You can say, play your favourite artist name, to begin.";
    if (playbackInfo.hasPreviousPlaybackSession) {
      playbackInfo.inPlaybackSession = false;
      message = `You were listening to ${
        playbackInfo.playOrder[playbackInfo.index].snippet.title
      }. Would you like to resume?`;
      reprompt = "You can say yes to resume or no to play from the top.";
    }

    return handlerInput.responseBuilder
      .speak(message)
      .reprompt(reprompt)
      .getResponse();
  },
};

const StartPlaybackHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);

    if (!playbackInfo.inPlaybackSession) {
      return (
        Alexa.getRequestType(handlerInput.requestEnvelope) ===
          "IntentRequest" &&
        Alexa.getIntentName(handlerInput.requestEnvelope) === "GetVideoIntent"
      );
    }
    if (
      Alexa.getRequestType(handlerInput.requestEnvelope) ===
      "PlaybackController.PlayCommandIssued"
    ) {
      return true;
    }

    if (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest"
    ) {
      return (
        Alexa.getIntentName(handlerInput.requestEnvelope) === "GetVideoIntent"
      );
    }
  },
  handle(handlerInput) {
    console.log("StartPlaybackHandler");
    const speechText =
      handlerInput.requestEnvelope.request.intent.slots.videoQuery.value;
    console.log(speechText);
    return controller.search(handlerInput, speechText, null);
  },
};

const YesIntentHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);

    return (
      !playbackInfo.inPlaybackSession &&
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.YesIntent"
    );
  },
  handle(handlerInput) {
    console.log("YesHandler");
    return controller.play(handlerInput, "Resuming ");
  },
};

const NoIntentHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);

    return (
      !playbackInfo.inPlaybackSession &&
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.NoIntent"
    );
  },
  async handle(handlerInput) {
    console.log("NoHandler");
    const playbackInfo = await getPlaybackInfo(handlerInput);
    playbackInfo.offsetInMilliseconds = 0;
    return controller.play(handlerInput, "Starting Over ");
  },
};

const ResumePlaybackIntentHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);

    return (
      playbackInfo.inPlaybackSession &&
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      (Alexa.getIntentName(handlerInput.requestEnvelope) ===
        "AMAZON.PlayIntent" ||
        Alexa.getIntentName(handlerInput.requestEnvelope) ===
          "AMAZON.ResumeIntent")
    );
  },
  handle(handlerInput) {
    return controller.play(handlerInput, "Resuming ");
  },
};

const StartOverIntentHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);

    return (
      playbackInfo.inPlaybackSession &&
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) ===
        "AMAZON.StartOverIntent"
    );
  },
  handle(handlerInput) {
    console.log("StartOverHandler");
    playbackInfo.offsetInMilliseconds = 0;
    return controller.play(handlerInput, "Starting Over ");
  },
};

const NextPlaybackIntentHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);

    return (
      playbackInfo.inPlaybackSession &&
      (Alexa.getRequestType(handlerInput.requestEnvelope) ===
        "PlaybackController.NextCommandIssued" ||
        (Alexa.getRequestType(handlerInput.requestEnvelope) ===
          "IntentRequest" &&
          Alexa.getIntentName(handlerInput.requestEnvelope) ===
            "AMAZON.NextIntent"))
    );
  },
  handle(handlerInput) {
    console.log("NextPlaybackHandler");
    return controller.playNext(handlerInput);
  },
};

const PreviousPlaybackIntentHandler = {
  async canHandle(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);

    return (
      playbackInfo.inPlaybackSession &&
      (Alexa.getRequestType(handlerInput.requestEnvelope) ===
        "PlaybackController.PreviousCommandIssued" ||
        (Alexa.getRequestType(handlerInput.requestEnvelope) ===
          "IntentRequest" &&
          Alexa.getIntentName(handlerInput.requestEnvelope) ===
            "AMAZON.PreviousIntent"))
    );
  },
  handle(handlerInput) {
    console.log("PreviousPlaybackHandler");
    return controller.playPrevious(handlerInput);
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
      "Welcome to the Hey Tube. You can say, play your favourite artist name, to begin.";

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};
const PauseAndStopIntentHandler = {
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
    console.log("PauseAndStopIntentHandler");
    return controller.stop(handlerInput, "Pausing ");
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

    return handlerInput.responseBuilder.speak("Loop turned on").getResponse();
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

    return handlerInput.responseBuilder.speak("Loop turned off").getResponse();
  },
};

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
      case "PlaybackNearlyFinished":
        {
          if (playbackInfo.nextStreamEnqueued) {
            break;
          }
          if (playbackInfo.index == constants.config.pageSize - 1) {
            //Reached the end of the playList, fetch nextPage
            console.log("End of Playlist, search with nextToken");
            return controller.search(
              handlerInput,
              playbackInfo.query,
              playbackInfo.nextPageToken
            );
          } else {
            let nextAudio;
            const playbackSetting = await getPlaybackSetting(handlerInput);
            if (playbackSetting.loop) {
              nextAudio = playbackInfo.playOrder[playbackInfo.index];
            } else {
              nextAudio = playbackInfo.playOrder[playbackInfo.index + 1];
            }
            const audioFormat = await getAudioUrl(nextAudio.id.videoId);
            const expectedPreviousToken = playbackInfo.token;
            const offsetInMilliseconds = 0;
            const playBehavior = "ENQUEUE";
            playbackInfo.nextStreamEnqueued = true;

            responseBuilder.addAudioPlayerPlayDirective(
              playBehavior,
              audioFormat.url,
              nextAudio.id.videoId,
              offsetInMilliseconds,
              expectedPreviousToken
            );
          }
        }
        break;
      case "PlaybackFailed":
        playbackInfo.inPlaybackSession = false;
        console.log(
          "Playback Failed : %j",
          handlerInput.requestEnvelope.request.error
        );
        //Skip to the next audio
        return controller.playNext(handlerInput);
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
  async search(handlerInput, query, nextPageToken) {
    console.log(query);
    const data = await searchForVideos(
      query,
      nextPageToken,
      constants.config.pageSize
    );
    const playbackInfo = await getPlaybackInfo(handlerInput);
    playbackInfo.playOrder = data.results;
    playbackInfo.index = 0;
    playbackInfo.offsetInMilliseconds = 0;
    playbackInfo.playbackIndexChanged = true;
    playbackInfo.query = query;
    playbackInfo.nextPageToken = data.nextPageToken;
    return this.play(handlerInput, "Playing ");
  },
  async play(handlerInput, message) {
    const { attributesManager, responseBuilder } = handlerInput;
    const playbackInfo = await getPlaybackInfo(handlerInput);
    const playBehavior = "REPLACE_ALL";
    const { playOrder, offsetInMilliseconds, index } = playbackInfo;
    const audioInfo = playOrder[index];
    const audioFormat = await getAudioUrl(audioInfo.id.videoId);
    console.log(`${message} ${audioInfo.snippet.title}`);
    responseBuilder
      .speak(`${message} ${audioInfo.snippet.title}`)
      .withShouldEndSession(true)
      .addAudioPlayerPlayDirective(
        playBehavior,
        audioFormat.url,
        audioInfo.id.videoId,
        offsetInMilliseconds,
        null
      );

    if (await canThrowCard(handlerInput)) {
      const cardTitle = `${audioInfo.snippet.title}`;
      const cardContent = `Playing ${audioInfo.snippet.title}`;
      responseBuilder.withSimpleCard(cardTitle, cardContent);
    }

    return responseBuilder.getResponse();
  },
  async stop(handlerInput, message) {
    return handlerInput.responseBuilder
      .speak(message)
      .addAudioPlayerStopDirective()
      .getResponse();
  },
  async playNext(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);
    console.log("PlayNext");
    if (playbackInfo.index == constants.config.pageSize - 1) {
      //Reached the end of the playList, fetch nextPage
      return controller.search(
        handlerInput,
        playbackInfo.query,
        playbackInfo.nextPageToken
      );
    } else {
      await setNextIndex(playbackInfo);
    }
    playbackInfo.offsetInMilliseconds = 0;
    playbackInfo.playbackIndexChanged = true;
    return this.play(handlerInput, "Playing Next ");
  },
  async playPrevious(handlerInput) {
    const playbackInfo = await getPlaybackInfo(handlerInput);
    if (playbackInfo.index === 0) {
      return handlerInput.responseBuilder
        .speak("You have reached the start of the playlist")
        .addAudioPlayerStopDirective()
        .getResponse();
    }
    playbackInfo.index = playbackInfo.index - 1;
    playbackInfo.offsetInMilliseconds = 0;
    playbackInfo.playbackIndexChanged = true;
    return this.play(handlerInput, "Playing Previous ");
  },
};

const searchForVideos = async (searchQuery, nextPageToken, amount) => {
  return await ytlist.searchVideos(searchQuery, nextPageToken, amount);
}

const getAudioUrl = async (videoId) => {
  const audioInfo = await ytdl.getInfo(videoId, {});
  const audioFormat = await ytdl.chooseFormat(audioInfo.formats, {
    quality: "140",
  });
  return audioFormat;
};

const getPlaybackInfo = async (handlerInput) => {
  const attributes = await handlerInput.attributesManager.getPersistentAttributes();
  return attributes.playbackInfo;
};

const getPlaybackSetting = async (handlerInput) => {
  const attributes = await handlerInput.attributesManager.getPersistentAttributes();
  return attributes.playbackSetting;
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

const canThrowCard = async (handlerInput) => {
  const playbackInfo = await getPlaybackInfo(handlerInput);

  if (
    Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
    playbackInfo.playbackIndexChanged
  ) {
    playbackInfo.playbackIndexChanged = false;
    return true;
  }
  return false;
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
    SystemExceptionHandler,
    StartPlaybackHandler,
    HelpIntentHandler,
    StartOverIntentHandler,
    YesIntentHandler,
    NoIntentHandler,
    LoopOnIntentHandler,
    LoopOffIntentHandler,
    NextPlaybackIntentHandler,
    PreviousPlaybackIntentHandler,
    ResumePlaybackIntentHandler,
    PauseAndStopIntentHandler,
    SessionEndedRequestHandler,
    AudioPlayerEventHandler
  )
  .addRequestInterceptors(LoadPersistentAttributesRequestInterceptor)
  .addResponseInterceptors(SavePersistentAttributesResponseInterceptor)
  .addErrorHandlers(ErrorHandler)
  .withAutoCreateTable(true)
  .withTableName(constants.config.dynamoDBTableName)
  .lambda();
