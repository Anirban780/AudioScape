const { saveSongListen } = require("./services/firestoreService");
 // r1awikvhx3A  SZWU0VQ8rZs ZPTn5jXfLPw
const test = async () => {
    const videoId = "ZPTn5jXfLPw"; // Replace with an actual video ID
    const userId = "kL7PQ8ui2DfWnrH4Lso0Pbt0oPh1";   // Replace with an actual user ID

    try {
        await saveSongListen(videoId, userId);
        console.log("Test completed successfully.");
    } catch (error) {
        console.error("Test failed:", error);
    }
};

test();
