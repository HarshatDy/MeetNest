import React, { createContext, useState, useContext, useEffect } from 'react';
import { getPosts, createPost } from '../src/services/mongoService';
import { Logger } from '../utils/Logger';

const TimelineContext = createContext();

export function TimelineProvider({ children }) {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Fetch posts from MongoDB
  const fetchPosts = async (societyId = 'default') => {
    setIsLoading(true);
    setError(null);
    
    try {
      Logger.debug('TimelineContext', 'Fetching posts from MongoDB');
      
      const fetchedPosts = await getPosts(societyId, 20);
      setPosts(fetchedPosts);
      
      Logger.debug('TimelineContext', `Fetched ${fetchedPosts.length} posts`);
    } catch (err) {
      Logger.error('TimelineContext', 'Failed to fetch posts', err);
      setError('Failed to load posts: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch posts on mount and when refreshKey changes
  useEffect(() => {
    fetchPosts();
  }, [refreshKey]);
  
  // Add a post
  const addPost = async (post) => {
    try {
      // Immediately add to state for optimistic UI update
      setPosts(prevPosts => [post, ...prevPosts]);
      
      // Then actually save to MongoDB
      const result = await createPost(post);
      
      // Force refresh to ensure data is consistent
      setRefreshKey(prev => prev + 1);
      
      return result;
    } catch (err) {
      Logger.error('TimelineContext', 'Failed to add post', err);
      throw err;
    }
  };
  
  const refreshTimeline = () => {
    setRefreshKey(prev => prev + 1);
  };
  
  return (
    <TimelineContext.Provider
      value={{
        posts,
        isLoading,
        error,
        refreshTimeline,
        addPost,
      }}
    >
      {children}
    </TimelineContext.Provider>
  );
}

export const useTimeline = () => useContext(TimelineContext);
