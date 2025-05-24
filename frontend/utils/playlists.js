import { addDoc, collection, deleteDoc, doc, getDocs, getDoc, updateDoc } from "firebase/firestore"
import { db } from "../firebase/firebaseConfig"

export const createPlaylist = async (userId, name) => {
    const ref = collection(db, 'users', userId, 'playlists');

    return await addDoc(ref, {
        name,
        createdAt: new Date(),
        updatedAt: new Date(),
        songs: []
    })
};

export const getPlaylists = async (userId) => {
    const snapshot = await getDocs(collection(db, 'users', userId, 'playlists'));
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export const deletePlaylist = async (userId, playlistId) => {
    await deleteDoc(doc(db, 'users', userId, 'playlists', playlistId));
};

export const addSongToPlaylist = async (userId, playlistId, song) => {
    const ref = doc(db, 'users', userId, 'playlists', playlistId);
    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) throw new Error("Playlist not found");

    const data = snapshot.data();
    const songs = data.songs || [];

    // Prevent duplicate song ID
    const alreadyExists = songs.some((s) => s.id === song.id);
    if (alreadyExists) return;

    const updatedSongs = [
        ...songs,
        {
            ...song,
            addedAt: new Date()
        }
    ];

    await updateDoc(ref, {
        songs: updatedSongs,
        updatedAt: new Date()
    });
};

export const removeSongFromPlaylist = async (userId, playlistId, songId) => {
  const ref = doc(db, 'users', userId, 'playlists', playlistId);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) throw new Error("Playlist not found");

  const data = snapshot.data();
  const updatedSongs = (data.songs || []).filter((song) => song.id !== songId);

  await updateDoc(ref, {
    songs: updatedSongs,
    updatedAt: new Date()
  });
};
