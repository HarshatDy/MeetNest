import React, { createContext, useState, useCallback } from 'react';
import { Logger } from '../utils/Logger';

export const TimelineContext = createContext({
  posts: [],
  addPost: () => {},
  updatePostStatus: () => {},
  refreshTimeline: () => {},
});

export const TimelineProvider = ({ children }) => {
  const [posts, setPosts] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Add a post to the timeline
  const addPost = useCallback((post) => {
    Logger.debug('TimelineContext', 'Adding post', { postId: post.id });
    setPosts(prevPosts => [post, ...prevPosts]);
  }, []);

  // Update a post's status (e.g., from 'uploading' to 'published')
  const updatePostStatus = useCallback((postId, status) => {
    Logger.debug('TimelineContext', 'Updating post status', { postId, status });
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId ? { ...post, status } : post
      )
    );
  }, []);

  // Force a refresh of the timeline
  const refreshTimeline = useCallback(() => {
    Logger.debug('TimelineContext', 'Refreshing timeline');
    setRefreshKey(prev => prev + 1);
  }, []);

  return (
    <TimelineContext.Provider 
      value={{ 
        posts, 
        addPost, 
        updatePostStatus, 
        refreshTimeline,
        refreshKey,
      }}
    >
      {children}
    </TimelineContext.Provider>
  );
};
