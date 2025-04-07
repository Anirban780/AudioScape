import React, { useState, useEffect } from "react";
import banner1 from "../../assets/banner_1.webp";
import banner2 from "../../assets/banner_2.webp";
import banner3 from "../../assets/banner_3.webp";
import banner4 from "../../assets/banner_4.webp";
import banner5 from "../../assets/banner_5.webp";

// Background images & headlines
const banners = [
  {
    image: banner1,
    headline: "Discover the Sound of Your Soul",
  },
  {
    image: banner2,
    headline: "Turn Up the Volume of Your Life",
  },
  {
    image: banner3,
    headline: "Feel Every Beat, Live Every Moment",
  },
  {
    image: banner4,
    headline: "Your Playlist, Your Identity",
  },
  {
    image: banner5,
    headline: "Music That Moves You",
  },
];

const HeroSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setNextIndex((currentIndex + 1) % banners.length);
      setTimeout(() => {
        setCurrentIndex((currentIndex + 1) % banners.length);
        setIsTransitioning(false);
      }, 1000);
    }, 5000);

    return () => clearInterval(interval);
  }, [currentIndex]);

  useEffect(() => {
    banners.forEach(banner => {
      const img = new Image();
      img.src = banner.image;
    });
  }, []);

  return (
    <div className="relative h-[70vh] overflow-hidden rounded-lg shadow-2xl text-white">
      {/* Backgrounds */}
      {banners.map((banner, index) => (
        <div
          key={index}
          className="absolute inset-0 w-full h-full px-2 bg-cover bg-center transition-opacity duration-1000 ease-in-out"
          style={{
            backgroundImage: `url(${banner.image})`,
            opacity: index === currentIndex ? 1 : 0,
            zIndex: index === currentIndex ? 1 : 0,
          }}
        />
      ))}

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40 z-[2]" />

      {/* Content */}
      <div className="relative z-10 h-full w-full flex flex-col justify-center items-center px-6 text-white text-center">
        <h1
          className="text-4xl md:text-5xl font-extrabold mb-6 drop-shadow-lg transition-opacity duration-700 ease-in-out"
          style={{ opacity: isTransitioning ? 0 : 1 }}
        >
          {banners[currentIndex].headline}
        </h1>
        <p
          className="text-lg md:text-2xl max-w-xl text-gray-300 mb-10 font-light tracking-wide transition-opacity duration-700 ease-in-out delay-100"
          style={{ opacity: isTransitioning ? 0 : 1 }}
        >
          Immerse yourself in the beats that define your moments
        </p>
        <button className="px-8 py-3 bg-white/10 backdrop-blur-md border border-white/20 text-white font-semibold text-lg rounded-full shadow-md hover:bg-white/20 transition duration-300 ease-in-out transform hover:scale-105">
          Start Listening
        </button>
      </div>
    </div>
  );
};

export default HeroSection;
