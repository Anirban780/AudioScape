import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button'; // Adjust path based on your Shadcn setup
import { Link } from 'react-router-dom';

const NotFound = () => {
    // Set the document title when the component mounts
    useEffect(() => {
        document.title = 'Page Not Found - My Music App';
    }, []);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-800 to-pink-600">
            <div className="text-center">
                <div className="text-6xl md:text-9xl font-extrabold text-purple-500 mb-8">404</div>
                <h1 className="text-2xl md:text-4xl font-bold text-white mb-4">Page Not Found</h1>
                <p className="text-base md:text-lg text-gray-300 mb-8">
                    The page you’re looking for doesn’t exist or has been moved. Let’s get you back on track.
                </p>
                <Link to='/'>
                    <Button variant="primary" size="lg">
                        Go to Homepage
                    </Button>
                </Link>
            </div>
        </div>
    );
};

export default NotFound;