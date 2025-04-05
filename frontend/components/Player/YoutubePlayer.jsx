import YouTube from "react-youtube";
import { saveSongListen } from "../../utils/api";

const YouTubePlayer = ({ trackId, onReady, setDuration, setIsPlaying, track }) => {
    const opts = {
        height: "0",
        width: "0",
        playerVars: {
            autoplay: 0,
            controls: 0,
            modestbranding: 1,
            rel: 0,
            enablejsapi: 1,
            playsinline: 1,
            iv_load_policy: 3,
            fs: 0,
            disablekb: 1,
        },
    };

    return (
        <div className="hidden">
            <YouTube
                videoId={trackId || ""}
                opts={opts}
                onReady={onReady}
                onStateChange={(event) => {
                    const state = event.data;
                    const player = event.target;
                    if (state === 1) {
                        setIsPlaying(true);
                        setDuration(player.getDuration());
                        saveSongListen(track?.id);
                        player.setPlaybackQuality("small");
                    } else if (state === 2) {
                        setIsPlaying(false);
                    } else if (state === 5) {
                        setDuration(player.getDuration());
                    }
                }}
            />
        </div>
    );
};

export default YouTubePlayer;
