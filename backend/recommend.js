const natural = require('natural')
const TfIdf = natural.TfIdf;

// Function to calculate the weight of a song based on liked, lastPlayedAt, and playCount
function calculateSongWeight(song, currentTimestamp) {
    const likedWeight = song.liked ? 2 : 1;  // Songs that are liked get a higher weight
    const recencyWeight = Math.max(0, 1 - (currentTimestamp - song.lastPlayedAt) / (1000 * 60 * 60 * 24 * 30));  // Weight decreases with age (1 month max)
    const playCountWeight = Math.min(5, song.playCount / 5);  // Cap play count weight to a maximum of 5
    const randomFactor = 0.9 + Math.random() * 0.2; // Add 10-20% random variation

    return likedWeight * (0.5 * recencyWeight + 0.5 * playCountWeight) * randomFactor;  // Combine the weights with random factor
}

// Function to extract genre text
function extractGenreText(song, currentTimestamp) {
    const weight = calculateSongWeight(song, currentTimestamp);
    if (Array.isArray(song.keywords)) {
        return song.keywords.join(' ') + ' ' + weight;  // Append weight to genre text
    }
    return '';
}

// Recommendation function
function recommendSongs(userHistory, relatedTracks, currentTimestamp, topN = 10) {
    const tfidf = new TfIdf();

    const userGenres = userHistory
        .map(song => extractGenreText(song, currentTimestamp))
        .filter(Boolean);

    const relatedKeywords = [];
    const allRelatedTracks = [];

    relatedTracks.forEach(group => {
        if (group.keyword) {
            relatedKeywords.push(group.keyword);
            group.tracks.forEach(track => {
                allRelatedTracks.push({ keyword: group.keyword, track });
            })
        }
    });

    if (userGenres.length === 0 || relatedKeywords.length === 0) {
        return [];
    }

    // Build TF-IDF documents
    userGenres.forEach(genreText => tfidf.addDocument(genreText));
    relatedKeywords.forEach(keyword => tfidf.addDocument(keyword));

    const userVectors = userGenres.map((_, i) => tfidf.listTerms(i));
    const relatedVectors = relatedKeywords.map((_, i) => tfidf.listTerms(i + userGenres.length));

    // Calculate cosine similarity with a small random perturbation
    function cosineSimilarity(vecA, vecB) {
        const dictA = Object.fromEntries(vecA.map(({ term, tfidf }) => [term, tfidf]));
        const dictB = Object.fromEntries(vecB.map(({ term, tfidf }) => [term, tfidf]));

        const terms = new Set([...Object.keys(dictA), ...Object.keys(dictB)]);

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        terms.forEach(term => {
            const a = dictA[term] || 0;
            const b = dictB[term] || 0;
            dotProduct += a * b;
            normA += a * a;
            normB += b * b;
        });

        if (normA === 0 || normB === 0) {
            return 0;
        }

        const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
        return similarity * (0.95 + Math.random() * 0.1); // Add 0-10% random perturbation
    }

    const scores = relatedVectors.map(relatedVec => {
        return userVectors.reduce((sum, userVec) => sum + cosineSimilarity(userVec, relatedVec), 0);
    });

    // Get top N recommendations with randomized selection
    const topIndices = scores
        .map((score, index) => ({ score, index }))
        .sort((a, b) => {
            const diff = b.score - a.score;
            // If scores are close (within 0.01), randomly decide order
            if (Math.abs(diff) < 0.01) {
                return Math.random() > 0.5 ? 1 : -1;
            }
            return diff;
        })
        .slice(0, topN + 5) // Get extra candidates to allow for random selection
        .map(item => item.index);

    const recommended = [];
    const usedKeywords = new Set();

    // Shuffle topIndices to introduce more randomness
    for (let i = topIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [topIndices[i], topIndices[j]] = [topIndices[j], topIndices[i]];
    }

    topIndices.forEach(index => {
        const keyword = relatedKeywords[index];
        if (!usedKeywords.has(keyword)) {
            usedKeywords.add(keyword);
            const matchingTracks = allRelatedTracks.filter(({ keyword: k }) => k === keyword);
            // Randomly select one track from matching tracks
            if (matchingTracks.length > 0 && recommended.length < topN) {
                const randomTrack = matchingTracks[Math.floor(Math.random() * matchingTracks.length)];
                recommended.push(randomTrack.track);
            }
        }
    });

    // If we don't have enough recommendations, fill with random tracks
    while (recommended.length < topN && allRelatedTracks.length > 0) {
        const remainingTracks = allRelatedTracks.filter(({ keyword }) => !usedKeywords.has(keyword));
        if (remainingTracks.length > 0) {
            const randomTrack = remainingTracks[Math.floor(Math.random() * remainingTracks.length)];
            usedKeywords.add(randomTrack.keyword);
            recommended.push(randomTrack.track);
        } else {
            break;
        }
    }

    return recommended.slice(0, topN);
}

module.exports = { recommendSongs };