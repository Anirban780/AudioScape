const axios = require("axios")
const { API_KEY } = require("../config/youtubeAuth")

const getMusicCategoryId = async () => {
    const url = `https://www.googleapis.com/youtube/v3/videoCategories?part=snippet&regionCode=US&key=${API_KEY}`;
    const response = await axios.get(url);
    const musicCategory = response.data.items.find(item => item.snippet.title.toLowerCase() === 'music');
    return musicCategory ? musicCategory.id : null;
};

const searchTrack = async (query, pageToken = "") => {
    const musicCategoryId = await getMusicCategoryId();
    if (!musicCategoryId) throw new Error("Music category not found");

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&maxResults=10&videoCategoryId=${musicCategoryId}&key=${API_KEY}&pageToken=${pageToken}`;

    try {
        const response = await axios.get(url);
        const seenVideoIds = new Set();

        const filteredTracks = response.data.items
            .filter(item => item.id.videoId && !seenVideoIds.has(item.id.videoId))
            .map(item => {
                seenVideoIds.add(item.id.videoId);
                return {
                    videoId: item.id.videoId,
                    title: item.snippet.title,
                    thumbNail: item.snippet.thumbnails.default.url || item.snippet.thumbnails.high.url,
                    channelTitle: item.snippet.channelTitle,
                };
            });

        return {
            tracks: filteredTracks,
            nextPageToken: response.data.nextPageToken || null,
        };
    } catch (error) {
        console.error("Error fetching YouTube search results:", error);
        throw new Error("Failed to search for tracks");
    }
};


const getTrackDetails = async(videoId) => {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${API_KEY}`;

    const response = await axios.get(url);
    if(!response.data.items.length)
        return null

    const track = response.data.items[0];
    return {
        videoId: track.id,
        title: track.snippet.title || 'Unknown Title',
        thumbNail: track.snippet.thumbnails.high.url,
        channelTitle: track.snippet.channelTitle || 'Unknown Artist',
        duration: track.contentDetails?.duration || 'PTOS',
        genre: track.snippet.tags || [],
        channelId: track.snippet.channelId || "Unknown"
    }

}

module.exports = { searchTrack, getTrackDetails }