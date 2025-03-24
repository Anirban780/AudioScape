import { auth } from '../firebase/firebaseConfig';

const BASE_URL = import.meta.env.VITE_PROD_BACKEND_URL || import.meta.env.VITE_BACKEND_URL

export async function saveSongListen(videoId) {
    if (!auth.currentUser) {
        throw new Error('User not logged in');
    }

    try {
        const token = await auth.currentUser.getIdToken();

        const response = await fetch(`${BASE_URL}/api/songs/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ videoId }),
            credentials: "include",
        });

        if (!response.ok) {
            throw new Error(`Failed to save song listen: ${response.statusText}`);
        }

        console.log('Song saved to database successfully');
    } catch (error) {
        console.error('Error saving song/track:', error);
    }
}
