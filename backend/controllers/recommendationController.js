const { getTopRecommendedSongs } = require('../services/recommendService');
const { fetchUserMusicHistory, fetchRelatedTracks } = require('../services/firestoreService'); // Assuming these are in a dataFetchService file

const recommendSongs = async(req, res) => {
    try {
        const { userId, topN } = req.body;

        // Validate inputs
        if (!userId || typeof topN !== 'number') {
            return res.status(400).json({ error: 'Invalid input format' });
        }

        // Fetch user history and related tracks
        const userHistory = await fetchUserMusicHistory(userId); // Fetch the user's music history
        const relatedTracks = await fetchRelatedTracks(); // Fetch the related tracks from the cache

        if (!userHistory || !relatedTracks) {
            return res.status(404).json({ error: 'Data not found' });
        }

        // Call the recommendation service
        const recommendations = await getTopRecommendedSongs(userHistory, relatedTracks, topN || 10);

        return res.status(200).json({
            success: true,
            recommendations: recommendations,
        });
    } catch (error) {
        console.error('Error in recommendation controller:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
}

module.exports = {
    recommendSongs,
}
