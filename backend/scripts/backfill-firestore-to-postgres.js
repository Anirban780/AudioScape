require("dotenv").config({ path: "../.env" });
const path = require("path");
// Fallback dotenv loading if running from backend root
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const admin = require("firebase-admin");

const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgrespassword@postgres:5432/audioscape?schema=public" });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Initialize Firebase Admin with credentials from environment variables (.env)
if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
    const privateKey = rawPrivateKey ? rawPrivateKey.replace(/\\n/g, "\n") : undefined;

    if (projectId && clientEmail && privateKey) {
        console.log(`🔐 Initializing Firebase Admin for project: ${projectId}`);
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            }),
        });
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    } else {
        admin.initializeApp({
            projectId: projectId || "audioscape-49565",
        });
    }
}

const db = admin.firestore();

// Helper to convert Firestore timestamp or ISO string to JS Date
function parseFirestoreDate(val) {
    if (!val) return new Date();
    if (typeof val.toDate === "function") {
        return val.toDate();
    }
    if (val._seconds) {
        return new Date(val._seconds * 1000 + (val._nanoseconds || 0) / 1000000);
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
}

async function main() {
    console.log("🚀 Starting Firestore to PostgreSQL migration...");

    let totalUsers = 0;
    let totalTracks = 0;
    let totalHistories = 0;
    let totalPlaylists = 0;
    let totalPlaylistTracks = 0;
    let totalSearchQueries = 0;

    try {
        // 1. Fetch all users from Firestore
        const usersSnapshot = await db.collection("users").get();
        console.log(`📋 Found ${usersSnapshot.size} user document(s) in Firestore.`);

        for (const userDoc of usersSnapshot.docs) {
            const firebaseUid = userDoc.id;
            const userData = userDoc.data();

            // Upsert User in PostgreSQL
            const user = await prisma.user.upsert({
                where: { authId: firebaseUid },
                update: {
                    displayName: userData.displayName || userData.name || null,
                    email: userData.email || null,
                    photoUrl: userData.photoUrl || null,
                },
                create: {
                    authId: firebaseUid,
                    displayName: userData.displayName || userData.name || null,
                    email: userData.email || null,
                    photoUrl: userData.photoUrl || null,
                },
            });
            totalUsers++;
            console.log(`👤 Processed User: ${user.authId} (DB ID: ${user.id})`);

            // 2. Fetch User Music History
            const historySnapshot = await db.collection("users").doc(firebaseUid).collection("music_history").get();
            console.log(`   🎵 Found ${historySnapshot.size} music history record(s) for user.`);

            for (const songDoc of historySnapshot.docs) {
                const songData = songDoc.data();
                const videoId = songData.id || songDoc.id;

                if (!videoId) continue;

                // Ensure Track exists with direct artist string preserved
                await prisma.tracks.upsert({
                    where: { youtubeVideoId: videoId },
                    update: {
                        title: songData.name || songData.title || "Untitled Track",
                        artist: songData.artist || null,
                        thumbnailUrl: songData.thumbnail || null,
                        duration: songData.duration || null,
                        genre: Array.isArray(songData.genre) ? songData.genre : (songData.genre ? [songData.genre] : []),
                    },
                    create: {
                        youtubeVideoId: videoId,
                        title: songData.name || songData.title || "Untitled Track",
                        artist: songData.artist || null,
                        thumbnailUrl: songData.thumbnail || null,
                        duration: songData.duration || null,
                        genre: Array.isArray(songData.genre) ? songData.genre : (songData.genre ? [songData.genre] : []),
                    },
                });
                totalTracks++;

                // Upsert ListenHistory
                const lastPlayedAt = parseFirestoreDate(songData.lastPlayedAt);

                await prisma.listenHistory.upsert({
                    where: {
                        userId_trackId: {
                            userId: user.id,
                            trackId: videoId,
                        },
                    },
                    update: {
                        playCount: songData.playCount || 1,
                        liked: songData.liked || false,
                        lastPlayedAt: lastPlayedAt,
                    },
                    create: {
                        userId: user.id,
                        trackId: videoId,
                        playCount: songData.playCount || 1,
                        liked: songData.liked || false,
                        lastPlayedAt: lastPlayedAt,
                    },
                });
                totalHistories++;
            }

            // 3. Fetch User Playlists
            const playlistsSnapshot = await db.collection("users").doc(firebaseUid).collection("playlists").get();
            console.log(`   📂 Found ${playlistsSnapshot.size} playlist(s) for user.`);

            for (const playlistDoc of playlistsSnapshot.docs) {
                const playlistData = playlistDoc.data();
                const playlistName = playlistData.name || `Playlist ${playlistDoc.id}`;

                const plCreatedAt = parseFirestoreDate(playlistData.createdAt);
                const plUpdatedAt = parseFirestoreDate(playlistData.updatedAt || playlistData.createdAt);

                const playlist = await prisma.playlist.upsert({
                    where: {
                        userId_name: {
                            userId: user.id,
                            name: playlistName,
                        },
                    },
                    update: {
                        createdAt: plCreatedAt,
                        updatedAt: plUpdatedAt,
                    },
                    create: {
                        userId: user.id,
                        name: playlistName,
                        createdAt: plCreatedAt,
                        updatedAt: plUpdatedAt,
                    },
                });
                totalPlaylists++;

                const songs = playlistData.songs || [];
                for (let i = 0; i < songs.length; i++) {
                    const song = songs[i];
                    const songId = song.id || song.videoId;
                    if (!songId) continue;

                    // Ensure track exists with artist string
                    await prisma.tracks.upsert({
                        where: { youtubeVideoId: songId },
                        update: {
                            title: song.name || song.title || "Untitled Track",
                            artist: song.artist || null,
                            thumbnailUrl: song.thumbnail || null,
                            duration: song.duration || null,
                        },
                        create: {
                            youtubeVideoId: songId,
                            title: song.name || song.title || "Untitled Track",
                            artist: song.artist || null,
                            thumbnailUrl: song.thumbnail || null,
                            duration: song.duration || null,
                        },
                    });

                    // Add to PlaylistTrack
                    const addedAt = parseFirestoreDate(song.addedAt || playlistData.createdAt);

                    await prisma.playlistTrack.upsert({
                        where: {
                            playlistId_trackId: {
                                playlistId: playlist.id,
                                trackId: songId,
                            },
                        },
                        update: {
                            position: i,
                            addedAt: addedAt,
                        },
                        create: {
                            playlistId: playlist.id,
                            trackId: songId,
                            position: i,
                            addedAt: addedAt,
                        },
                    });
                    totalPlaylistTracks++;
                }
            }
        }

        // 4. Fetch relatedTracksCache
        const cacheSnapshot = await db.collection("relatedTracksCache").get();
        console.log(`🔍 Found ${cacheSnapshot.size} related tracks cache entry/entries in Firestore.`);

        for (const cacheDoc of cacheSnapshot.docs) {
            const rawKeyword = cacheDoc.id;
            const normalizedKeyword = rawKeyword.trim().toLowerCase();
            const cacheData = cacheDoc.data();
            const tracks = cacheData.tracks || [];

            const searchQuery = await prisma.searchQuery.upsert({
                where: { normalizedQuery: normalizedKeyword },
                update: {
                    hitCount: { increment: 1 },
                    resultCount: tracks.length,
                },
                create: {
                    normalizedQuery: normalizedKeyword,
                    rawQuery: rawKeyword,
                    queryType: "CURATED_KEYWORD",
                    resultCount: tracks.length,
                },
            });
            totalSearchQueries++;

            for (let i = 0; i < tracks.length; i++) {
                const trk = tracks[i];
                if (!trk.id) continue;

                // Handle Channel upsert if channelId is available
                if (trk.channelId) {
                    await prisma.channel.upsert({
                        where: { id: trk.channelId },
                        update: {
                            title: trk.artist || "Unknown Channel",
                        },
                        create: {
                            id: trk.channelId,
                            title: trk.artist || "Unknown Channel",
                        },
                    });
                }

                // Ensure Track exists with direct artist string preserved
                await prisma.tracks.upsert({
                    where: { youtubeVideoId: trk.id },
                    update: {
                        title: trk.name || trk.title || "Untitled Track",
                        artist: trk.artist || null,
                        channelId: trk.channelId || null,
                        thumbnailUrl: trk.thumbnail || null,
                        duration: trk.duration || null,
                        genre: Array.isArray(trk.genre) ? trk.genre : (trk.genre ? [trk.genre] : []),
                    },
                    create: {
                        youtubeVideoId: trk.id,
                        title: trk.name || trk.title || "Untitled Track",
                        artist: trk.artist || null,
                        channelId: trk.channelId || null,
                        thumbnailUrl: trk.thumbnail || null,
                        duration: trk.duration || null,
                        genre: Array.isArray(trk.genre) ? trk.genre : (trk.genre ? [trk.genre] : []),
                    },
                });

                // Add to QueryTrackResult
                await prisma.queryTrackResult.upsert({
                    where: {
                        queryId_trackId: {
                            queryId: searchQuery.id,
                            trackId: trk.id,
                        },
                    },
                    update: { rankPosition: i },
                    create: {
                        queryId: searchQuery.id,
                        trackId: trk.id,
                        rankPosition: i,
                    },
                });
            }
        }

        console.log("\n==========================================");
        console.log("✅ FIRESTORE TO POSTGRES MIGRATION COMPLETE!");
        console.log("==========================================");
        console.log(`Users Migrated:          ${totalUsers}`);
        console.log(`Tracks Migrated:         ${totalTracks}`);
        console.log(`Listen Histories:        ${totalHistories}`);
        console.log(`Playlists:               ${totalPlaylists}`);
        console.log(`Playlist Tracks:         ${totalPlaylistTracks}`);
        console.log(`Search Queries Cached:   ${totalSearchQueries}`);
        console.log("==========================================\n");

    } catch (err) {
        console.error("❌ Migration failed with error:", err);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

main();
