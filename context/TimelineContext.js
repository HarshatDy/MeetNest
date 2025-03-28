import React, { createContext, useState, useContext, useEffect } from 'react';

export const TimelineContext = createContext();

export const TimelineProvider = ({ children }) => {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Function to add a new post to the timeline
  const addPost = (newPost) => {
    setPosts(prevPosts => [newPost, ...prevPosts]);
  };

  // Function to like a post
  const likePost = (postId) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { ...post, likes: post.likes + 1 } 
          : post
      )
    );
  };

  // Function to add a comment to a post
  const commentOnPost = (postId, comment) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { ...post, comments: [...post.comments, comment] } 
          : post
      )
    );
  };

  // Fetch initial posts (mock)
  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      // In a real app, you'd fetch from an API
      // For now, we'll just use a timeout to simulate network request
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      const mockPosts = [
        {
          id: '1',
          content: 'Just joined the neighborhood cleanup!',
          image: 'https://via.placeholder.com/400x300',
          activity: 'Community Cleanup',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          user: {
            id: 'user1',
            name: 'Jane Smith',
            avatar: 'https://via.placeholder.com/50'
          },
          likes: 12,
          comments: [
            { id: 'c1', user: 'Mike', text: 'Great initiative!', timestamp: new Date().toISOString() }
          ]
        },
        // More mock posts...
      ];
      
      setPosts(mockPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    <TimelineContext.Provider 
      value={{ 
        posts, 
        isLoading, 
        addPost, 
        likePost, 
        commentOnPost,
        refreshPosts: fetchPosts
      }}
    >
      {children}
    </TimelineContext.Provider>
  );
};

// Custom hook for using timeline context
export const useTimeline = () => useContext(TimelineContext);
