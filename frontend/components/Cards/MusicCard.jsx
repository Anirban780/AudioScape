import React from "react";
import { Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useTheme } from "../../ThemeProvider"; // Ensure you have ThemeProvider

const MusicCard = ({ id, name, artist, image, onClick }) => {
  const { theme } = useTheme(); // Get the theme state

  return (
    <Card
      className={`relative cursor-pointer overflow-hidden shadow-md transition-transform hover:scale-105 
        ${theme === "dark" ? "bg-gray-900 text-white border-white border-2" : "bg-white text-black"}
      `}
      onClick={() => onClick(id)}
    >
      <CardContent className="p-4 flex flex-col items-center">
        <img
          src={image}
          alt={name}
          className="w-40 h-40 object-cover rounded-md" // Fixed size for consistency
        />

        <p className="mt-2 font-semibold truncate w-full text-center">{name}</p>

        {artist && <p className="text-sm text-gray-400 truncate w-full text-center">{artist}</p>}

        <div className="absolute bottom-4 right-4 bg-green-500 p-2 rounded-full">
          <Play size={18} className="text-white" />
        </div>

      </CardContent>
    </Card>
  );
};

export default MusicCard;
