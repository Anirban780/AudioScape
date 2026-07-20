const { recommendSongs } = require('../recommend'); // Import your JS recommend logic

const getTopRecommendedSongs = async (userHistory, relatedTracks, topN = 10) => {
  
    try {
    // Call the pure JS recommendation function
    const currentTimestamp = Date.now();
    const recommendations = recommendSongs(userHistory, relatedTracks, currentTimestamp, topN);
    return recommendations;

  } catch (error) {
    console.error('Error generating recommendations:', error);
    throw error;
  }
};

module.exports = {
  getTopRecommendedSongs,
};
