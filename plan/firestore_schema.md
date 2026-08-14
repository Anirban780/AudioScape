users: {
    uid,
    name,
    email,
    music_history: {
        document_id:
        artist,
        duration,
        genre: [],
        id,
        lastPlayedAt,
        liked,
        name,
        playCount,
        thumbnail,
    },
    playlists: {
        document_id:
        createdAt,
        id,
        name,
        songs: {
            addedAt,
            artist,
            id,
            name,
            thumbnail
        },
        updatedAt
    }
}

relatedTracksCache: {
    document_id,
    timestamp,
    tracks: {
        artist,
        channelId,
        duration,
        genre: [],
        id,
        name,
        thumbnail,
    }
}