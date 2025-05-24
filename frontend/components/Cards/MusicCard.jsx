import React, { useState } from "react";
import { ListPlus, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useTheme } from "../../ThemeProvider";
import usePlaylistStore from "../../store/usePlaylistStore";

const MusicCard = ({ id, name, artist, image, onClick }) => {
  const { theme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const { openModal } = usePlaylistStore();

  const songData = {
    id,
    name,
    artist,
    thumbnail: image,
    // Add more fields if needed, like duration, sourceUrl, etc.
  };

  return (
    <Card
      className={`relative cursor-pointer overflow-hidden shadow-md transition-transform w-full
         ${theme === "dark" ? "bg-gray-900 text-white border-white border-2" : "bg-white text-black border-gray-400 border-2"}
      `}
      onClick={() => onClick(id)}
    >
      {/* Three-dot button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          openModal(songData);
        }}
        className="absolute top-2 right-2 z-10 p-1 rounded-full bg-black/80 hover:bg-black dark:bg-gray-400/70 dark:hover:bg-gray-400 hover:cursor-pointer"
      >
        <ListPlus size={20} className="text-white dark:text-black" />
      </button>

      <CardContent className="p-4 flex flex-col items-center relative">
        <div
          className="relative w-full"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >

          <img
            src={image}
            alt={name}
            className={`w-full h-40 object-cover rounded-md transition-opacity duration-300 ${isHovered ? "opacity-70" : "opacity-100"
              }`}
          />

          {isHovered && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-md">
              <Play size={40} className="text-white bg-green-500 rounded-full p-2" />
            </div>
          )}
        </div>

        <p className="mt-2 font-semibold truncate w-full text-center">{name}</p>
        {artist && (
          <p className="text-sm text-gray-400 truncate w-full text-center">{artist}</p>
        )}
      </CardContent>

    </Card>
  );
};

export default MusicCard;
