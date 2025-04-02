import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { getDataFromDatabase } from '../utils/database'; // Ensure this is implemented

export default function HomePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getDataFromDatabase(); // Replace with actual database call
        setData(result);
      } catch (error) {
        console.error('Error fetching data:', error);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <ActivityIndicator />;
  }

  if (!data) {
    return <View><Text>No data available</Text></View>;
  }

  return (
    <View>
      <Text>Welcome to the Home Page</Text>
      {/* Render data */}
    </View>
  );
}
