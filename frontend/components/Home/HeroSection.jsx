import React, { useState, useEffect } from "react";
import banner1 from "../../assets/banner1.jpg";
import banner2 from "../../assets/banner2.jpg";
import banner3 from "../../assets/banner3.jpg";
import banner4 from "../../assets/banner4.jpg";
import banner5 from "../../assets/banner5.jpg";

// Background images & headlines
const banners = [
  {
    image: banner1, // Replace with actual paths
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
      
      // Set next index first for smoother transition
      setNextIndex((currentIndex + 1) % banners.length);
      
      // Short delay before changing current image
      setTimeout(() => {
        setCurrentIndex((currentIndex + 1) % banners.length);
        setIsTransitioning(false);
      }, 1000);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval); // Cleanup on unmount
  }, [currentIndex]);

  // Preload images for smooth transitions
  useEffect(() => {
    banners.forEach(banner => {
      const img = new Image();
      img.src = banner.image;
    });
  }, []);

  return (
    <div className="relative min-h-[70vh] w-full flex flex-col justify-center items-center text-center text-white rounded-lg overflow-hidden shadow-2xl">
      {/* Background Image Slideshow with crossfade effect */}
      {banners.map((banner, index) => (
        <div
          key={index}
          className="absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-1000 ease-in-out"
          style={{
            backgroundImage: `url(${banner.image})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: index === currentIndex ? 1 : 0,
            zIndex: index === currentIndex ? 1 : 0,
          }}
        />
      ))}

      {/* Dark Overlay for contrast */}
      <div className="absolute inset-0 bg-black/50 z-[2]"></div>

      {/* Hero Content */}
      <div className="relative z-10 px-6">
        <h1 
          className="text-5xl md:text-7xl font-extrabold mb-6 drop-shadow-lg transition-opacity duration-700 ease-in-out"
          style={{ opacity: isTransitioning ? 0 : 1 }}
        >
          {banners[currentIndex].headline}
        </h1>
        <p 
          className="text-xl md:text-2xl mx-auto text-gray-300 max-w-lg mb-10 font-light tracking-wide transition-opacity duration-700 ease-in-out delay-100"
          style={{ opacity: isTransitioning ? 0 : 1 }}
        >
          Immerse yourself in the beats that define your moments
        </p>

        {/* CTA Button - removed animate-bounce effect */}
        <button className="px-8 py-3 bg-white/10 backdrop-blur-md border border-white/20 text-white font-semibold text-lg rounded-full shadow-md hover:bg-white/20 transition duration-300 ease-in-out transform hover:scale-105">
          Start Listening
        </button>
      </div>
    </div>
  );
};

export default HeroSection;