import { useState, useEffect, useCallback } from 'react';
import * as mongoService from '../services/mongoService';

// Hook for fetching posts with pagination
export function usePosts(societyId, pageSize = 10) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastTimestamp, setLastTimestamp] = useState(null);

  // Initial fetch
  useEffect(() => {
    fetchInitialPosts();
  }, [societyId]);

  const fetchInitialPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await mongoService.getPosts(societyId, pageSize);
      setPosts(result);
      
      if (result.length > 0) {
        setLastTimestamp(result[result.length - 1].createdAt);
      }
      
      setHasMore(result.length === pageSize);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching initial posts:', err);
    } finally {
      setLoading(false);
    }
  }, [societyId, pageSize]);

  const fetchMorePosts = useCallback(async () => {
    if (!hasMore || loading || !lastTimestamp) return;
    
    setLoading(true);
    
    try {
      const newPosts = await mongoService.getPosts(
        societyId, 
        pageSize,
        lastTimestamp
      );
      
      if (newPosts.length > 0) {
        setPosts(prev => [...prev, ...newPosts]);
        setLastTimestamp(newPosts[newPosts.length - 1].createdAt);
      }
      
      setHasMore(newPosts.length === pageSize);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching more posts:', err);
    } finally {
      setLoading(false);
    }
  }, [societyId, pageSize, hasMore, loading, lastTimestamp]);

  return {
    posts,
    loading,
    error,
    hasMore,
    fetchMorePosts,
    refreshPosts: fetchInitialPosts
  };
}

// Add other hooks for events, tournaments, etc.