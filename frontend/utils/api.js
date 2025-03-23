import { auth } from '../firebase/firebaseConfig';

export async function saveSongListen(videoId) {
    if (!auth.currentUser) {
        throw new Error('User not logged in');
    }

    try {
        const token = await auth.currentUser.getIdToken();

        const response = await fetch('http://localhost:5000/api/songs/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ videoId }),
        });

        if (!response.ok) {
            throw new Error('Failed to save song listen');
        }
        console.log('Song saved to database successfully');
    }
    catch (error) {
        console.error('Error saving song/track:', error);
    }
}