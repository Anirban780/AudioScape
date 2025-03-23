// src/components/Home/Footer.jsx
import React from "react";
import { LucideGithub, LucideTwitter, LucideInstagram, Music } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-black bg-opacity-50 backdrop-blur-md py-8 px-6 text-gray-300 border-t border-gray-800">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Music className="w-6 h-6 text-pink-400 animate-pulse" />
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-indigo-400">
            Audioscape
          </span>
        </div>

        {/* Navigation Links */}
        <ul className="flex flex-wrap gap-6 text-sm font-medium">
          <li>
            <a href="#about" className="hover:text-pink-300 transition-colors duration-300">
              About
            </a>
          </li>
          <li>
            <a href="#features" className="hover:text-pink-300 transition-colors duration-300">
              Features
            </a>
          </li>
          <li>
            <a href="#contact" className="hover:text-pink-300 transition-colors duration-300">
              Contact
            </a>
          </li>
          <li>
            <a href="#privacy" className="hover:text-pink-300 transition-colors duration-300">
              Privacy Policy
            </a>
          </li>
        </ul>

        {/* Social Icons */}
        <div className="flex gap-4">
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-pink-400 transition-colors duration-300">
            <LucideGithub className="w-6 h-6" />
          </a>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-pink-400 transition-colors duration-300">
            <LucideTwitter className="w-6 h-6" />
          </a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-pink-400 transition-colors duration-300">
            <LucideInstagram className="w-6 h-6" />
          </a>
        </div>
      </div>
      <div className="mt-6 text-center text-sm text-gray-400">
        &copy; {new Date().getFullYear()} Audioscape. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;