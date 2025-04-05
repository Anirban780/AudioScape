import React, { useState } from "react";
import { Volume2 } from "lucide-react";

const VolumeBar = React.forwardRef(({ volume, setVolume, player, isReady }, ref) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleChange = (clientX) => {
        if (!ref.current || !player || !isReady) return;
        const rect = ref.current.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const newVolume = Math.round(pos * 100);
        player.setVolume(newVolume);
        setVolume(newVolume);
    };

    return (
        <div className="flex items-center gap-3 max-w-xs mx-auto">
            <Volume2 size={16} className="text-gray-400" />
            <div
                ref={ref}
                className="relative h-1 bg-gray-800 rounded-full cursor-pointer flex-1 group"
                onMouseDown={(e) => {
                    setIsDragging(true);
                    handleChange(e.clientX);
                }}
                onMouseMove={(e) => isDragging && handleChange(e.clientX)}
                onMouseUp={() => setIsDragging(false)}
            >
                <div className="absolute h-full bg-green-500 rounded-full" style={{ width: `${volume}%` }} />
                <div
                    className="absolute w-3 h-3 bg-white rounded-full -top-1 shadow-md group-hover:scale-125 transition"
                    style={{ left: `${volume}%`, transform: 'translateX(-50%)' }}
                />
            </div>
        </div>
    );
});

export default VolumeBar;
