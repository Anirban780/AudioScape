import React from "react";
import clsx from "clsx";
import { X } from "lucide-react";
import placeholder from "../../assets/placeholder.jpg";

const TrackQueue = ({ queue, currentIndex, setCurrentIndex, setTrack, showQueue, setShowQueue }) => {
    const handleQueueTrackClick = (track, index) => {
        setCurrentIndex(index);
        setTrack(track);
    };

    return (
        <div
            className={clsx(
                "fixed md:static top-0 right-0 h-full w-[350px] md:w-[400px] bg-gray-900 p-4 border-l border-gray-700 z-50 transform transition-transform duration-300 ease-in-out",
                {
                    "translate-x-0": showQueue,
                    "translate-x-full md:translate-x-0": !showQueue,
                }
            )}
        >
            {/* Hide button on mobile */}
            <div className="flex justify-between items-center mb-4 md:hidden">
                <h3 className="text-lg font-semibold">Up Next</h3>
                <button
                    onClick={() => setShowQueue(false)}
                    className="p-1 bg-gray-800 hover:bg-gray-700 rounded-full"
                >
                    <X size={18} />
                </button>
            </div>

            <h3 className="text-lg font-semibold mb-4 hidden md:block">UP NEXT</h3>
            {/* Queue Content */}
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
                {queue && queue.length > 0 ? (
                    queue.map((qTrack, index) => (
                        <div
                            key={`${qTrack.id}-${index}`}
                            className={clsx(
                                "flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors",
                                {
                                    "bg-gray-800": index === currentIndex,
                                }
                            )}
                            onClick={() => handleQueueTrackClick(qTrack, index)}
                        >
                            <img
                                src={qTrack.thumbnail || placeholder}
                                alt={qTrack.name}
                                className="w-14 h-14 object-cover rounded-md shadow-lg shrink-0"
                            />
                            <div className="flex flex-col overflow-hidden">
                                <p className="font-medium truncate">{qTrack.name}</p>
                                <p className="text-sm text-gray-400 truncate">{qTrack.artist}</p>
                            </div>
                        </div>

                    ))
                ) : (
                    <p className="text-gray-400">No tracks in queue</p>
                )}
            </div>
        </div>
    );
};

export default TrackQueue;
