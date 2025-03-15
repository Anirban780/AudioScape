import React, { useState } from "react";
import { Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useTheme } from "../../ThemeProvider"; // Ensure you have ThemeProvider

const MusicCard = ({ id, name, artist, image, onClick }) => {
  const { theme } = useTheme(); // Get the theme state
  const [isHovered, setIsHovered] = useState(false);


  return (
    <Card
      className={`relative cursor-pointer overflow-visible shadow-md transition-transform min-w-[180px]
         ${theme === "dark" ? "bg-gray-900 text-white border-white border-2" : "bg-white text-black"}
      `}
      onClick={() => onClick(id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-4 flex flex-col items-center relative">
        <img
          src={image}
          alt={name}
          className={`w-40 h-40 object-cover rounded-md transition-opacity duration-300 
            ${isHovered ? 'opacity-70' : 'opacity-100'}`}
        />

        <p className="mt-2 font-semibold truncate w-full text-center">{name}</p>

        {artist && <p className="text-sm text-gray-400 truncate w-full text-center">{artist}</p>}

        {isHovered && (
          <div className="absolute inset-0 flex items-center justify-center pb-10 bg-transparent bg-opacity-50 transition-opacity duration-300">
            <Play size={40} className="text-white bg-green-500 rounded-full px-2" />
          </div>
        )}

      </CardContent>
    </Card>
  );
};

export default MusicCard;
