exports.buildVideoCategoriesRequest = () => {
  return buildApiRequest(
    "GET",
    "/youtube/v3/videoCategories",
    {
      part: "snippet",
      regionCode: "US",
      key: process.env.YOUTUBE_API_KEY,
    },
    null
  );
};

exports.buildMostPopularVideosRequest = (
  amount = 12,
  loadDescription = false,
  nextPageToken,
  videoCategoryId = null
) => {
  let fields =
    "nextPageToken,prevPageToken,items(contentDetails/duration,id,snippet(channelId,channelTitle,publishedAt,thumbnails/medium,title),statistics/viewCount),pageInfo(totalResults)";
  if (loadDescription) {
    fields += ",items/snippet/description";
  }
  return buildApiRequest(
    "GET",
    "/youtube/v3/videos",
    {
      part: "snippet,statistics,contentDetails",
      chart: "mostPopular",
      maxResults: amount,
      regionCode: "US",
      pageToken: nextPageToken,
      fields,
      videoCategoryId,
      key: process.env.YOUTUBE_API_KEY,
    },
    null
  );
};

exports.buildVideoDetailRequest = (videoId) => {
  return buildApiRequest(
    "GET",
    "/youtube/v3/videos",
    {
      part: "snippet,statistics,contentDetails",
      id: videoId,
      key: process.env.YOUTUBE_API_KEY,
      fields:
        "kind,items(contentDetails/duration,id,snippet(channelId,channelTitle,description,publishedAt,thumbnails/medium,title),statistics)",
    },
    null
  );
};

exports.buildChannelRequest = (channelId) => {
  return buildApiRequest(
    "GET",
    "/youtube/v3/channels",
    {
      part: "snippet,statistics",
      id: channelId,
      key: process.env.YOUTUBE_API_KEY,
      fields:
        "kind,items(id,snippet(description,thumbnails/medium,title),statistics/subscriberCount)",
    },
    null
  );
};

exports.buildCommentThreadRequest = (videoId, nextPageToken) => {
  return buildApiRequest(
    "GET",
    "/youtube/v3/commentThreads",
    {
      part: "id,snippet",
      pageToken: nextPageToken,
      key: process.env.YOUTUBE_API_KEY,
      videoId,
    },
    null
  );
};

exports.buildSearchRequest = (query, nextPageToken, amount = 10) => {
  return buildApiRequest(
    "GET",
    "/youtube/v3/search",
    {
      part: "id,snippet",
      q: query,
      type: "video",
      pageToken: nextPageToken,
      maxResults: amount,
      key: process.env.YOUTUBE_API_KEY,
    },
    null
  );
};

exports.buildListPlaylistItemsRequest = (playlistId, nextPageToken, amount = 20) => {
  return buildApiRequest(
    "GET",
    "/youtube/v3/playlistItems",
    {
      part: "id,snippet",
      playlistId: playlistId,
      pageToken: nextPageToken,
      maxResults: amount,
      key: process.env.YOUTUBE_API_KEY,
    },
    null
  );
};

exports.buildRelatedVideosRequest = (videoId, amountRelatedVideos = 12) => {
  return buildApiRequest(
    "GET",
    "/youtube/v3/search",
    {
      part: "snippet",
      type: "video",
      maxResults: amountRelatedVideos,
      relatedToVideoId: videoId,
      key: process.env.YOUTUBE_API_KEY,
    },
    null
  );
};

/*
  Util - Youtube API boilerplate code
*/
function buildApiRequest(requestMethod, path, params, properties) {
  params = removeEmptyParams(params);
  let config;
  if (properties) {
    let resource = createResource(properties);
    config = {
      data: resource,
      method: requestMethod,
      url: path,
      params: params,
    };
  } else {
    config = {
      method: requestMethod,
      url: path,
      params: params,
    };
  }
  return config;
}

function removeEmptyParams(params) {
  for (var p in params) {
    if (!params[p] || params[p] === "undefined") {
      delete params[p];
    }
  }
  return params;
}

function createResource(properties) {
  var resource = {};
  var normalizedProps = properties;
  for (var p in properties) {
    var value = properties[p];
    if (p && p.substr(-2, 2) === "[]") {
      var adjustedName = p.replace("[]", "");
      if (value) {
        normalizedProps[adjustedName] = value.split(",");
      }
      delete normalizedProps[p];
    }
  }
  for (var prop in normalizedProps) {
    // Leave properties that don't have values out of inserted resource.
    if (normalizedProps.hasOwnProperty(prop) && normalizedProps[prop]) {
      var propArray = prop.split(".");
      var ref = resource;
      for (var pa = 0; pa < propArray.length; pa++) {
        var key = propArray[pa];
        if (pa === propArray.length - 1) {
          ref[key] = normalizedProps[prop];
        } else {
          ref = ref[key] = ref[key] || {};
        }
      }
    }
  }
  return resource;
}

/*
  Reducers
*/
exports.reduceSearchForVideos = (response, searchQuery) => {
  let searchResults = response.items.map((item) => ({
    ...item,
    videoId: item.id.videoId
  }));
  return {
    totalResults: response.pageInfo.totalResults,
    query: searchQuery,
    results: searchResults,
    nextPageToken: response.nextPageToken,
  };
};
