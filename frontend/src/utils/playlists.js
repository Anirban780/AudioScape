import { addDoc, arrayRemove, collection, deleteDoc, doc, getDocs, getDoc, updateDoc, query, setDoc, writeBatch, where } from "firebase/firestore"
import { db } from "@/firebase/firebaseConfig"

export const createPlaylist = async (userId, name) => {
    const trimmedName = name.trim();
    if (!trimmedName) throw new Error("Playlist name cannot be empty");

    const playlistsRef = collection(db, "users", userId, "playlists");

    const snapshot = await getDocs(playlistsRef);
    const isDuplicate = snapshot.docs.some(doc =>
        doc.data().name?.trim().toLowerCase() === trimmedName.toLowerCase()
    );

    if (isDuplicate) {
        throw new Error("Playlist name already exists");
    }

    const docRef = await addDoc(playlistsRef, {
        name,
        createdAt: new Date(),
        updatedAt: new Date(),
        songs: []
    });

    await updateDoc(docRef, { id: docRef.id });

    return docRef;
};

export const getPlaylists = async (userId) => {
    const snapshot = await getDocs(collection(db, 'users', userId, 'playlists'));
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const cleanupPlaylistFromSongs = async (userId, playlistId) => {
    const songsWithPl = query(
        collection(db, "users", userId, "music_history"),
        where("playlists", "array-contains", playlistId)
    );

    const snap = await getDocs(songsWithPl);
    if (snap.empty) return;

    const batch = writeBatch(db);

    snap.forEach((docSnap) => {
        const data = docSnap.data();
        const newList = (data.playlists || []).filter((id) => id !== playlistId);

        if (newList.length === 0) {
            batch.delete(docSnap.ref);
        } else {
            batch.update(docSnap.ref, { playlists: arrayRemove(playlistId) });
        }
    });

    await batch.commit();
};

export const deletePlaylist = async (userId, playlistId) => {
    await deleteDoc(doc(db, 'users', userId, 'playlists', playlistId));
    await cleanupPlaylistFromSongs(userId, playlistId);
};

export const addSongToPlaylist = async (userId, playlistId, song) => {
    const playlistRef = doc(db, 'users', userId, 'playlists', playlistId);
    const playlistSnap = await getDoc(playlistRef);

    if (!playlistSnap.exists()) {
        throw new Error('Playlist not found');
    }

    const playlistData = playlistSnap.data();
    const songs = playlistData.songs || [];

    const exists = songs.some((s) => s.id === song.id);
    if (exists) return;

    const updatedSongs = [...songs, { ...song, addedAt: new Date() }];
    await updateDoc(playlistRef, {
        songs: updatedSongs,
        updatedAt: new Date(),
    });

    const musicHistoryRef = collection(db, "users", userId, "music_history");
    const querySnapshot = await getDocs(musicHistoryRef);

    let found = false;

    querySnapshot.forEach((docSnap) => {
        const trackData = docSnap.data();

        if (trackData.id === song.id) {
            found = true;
            const updatedPlaylists = Array.from(
                new Set([...(trackData.playlists || []), playlistId])
            );

            updateDoc(docSnap.ref, {
                playlists: updatedPlaylists,
                updatedAt: new Date(),
            });
        }
    });

    if (!found) {
        const songRef = doc(db, "users", userId, "music_history", song.id);
        await setDoc(songRef, {
            ...song,
            playlists: [playlistId],
            savedAt: new Date(),
        });
    }
};

export const removeSongFromPlaylist = async (userId, playlistId, songId) => {
    const playlistRef = doc(db, 'users', userId, 'playlists', playlistId);
    const playlistSnap = await getDoc(playlistRef);
    if (!playlistSnap.exists()) throw new Error("Playlist not found");

    const data = playlistSnap.data();
    const updatedSongs = (data.songs || []).filter((s) => s.id !== songId);

    await updateDoc(playlistRef, {
        songs: updatedSongs,
        updatedAt: new Date()
    });

    const musicHistoryRef = collection(db, "users", userId, "music_history");
    const querySnapshot = await getDocs(musicHistoryRef);

    querySnapshot.forEach(async (docSnap) => {
        const songData = docSnap.data();

        if (songData.id === songId) {
            const updatedPlaylists = (songData.playlists || []).filter(
                (id) => id !== playlistId
            );

            await updateDoc(docSnap.ref, { playlists: updatedPlaylists });
        }
    });
};
