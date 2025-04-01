import { db } from '../config/firebase';
import { GeoFirestore } from 'geofirestore';

// Create a GeoFirestore reference
const geofirestore = new GeoFirestore(db);

// Create a GeoCollection reference
const eventsGeoCollection = geofirestore.collection('events');
const postsGeoCollection = geofirestore.collection('posts');

// Function to query nearby events
export const getNearbyEvents = async (lat, lng, radiusKm) => {
  try {
    const query = eventsGeoCollection.near({ 
      center: new firebase.firestore.GeoPoint(lat, lng),
      radius: radiusKm
    });
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      distance: doc.distance // distance in km
    }));
  } catch (error) {
    console.error('Error getting nearby events:', error);
    throw error;
  }
};

// Function to add an event with location
export const addGeoEvent = async (eventData) => {
  try {
    const { latitude, longitude, ...eventDetails } = eventData;
    
    // Add the event to Firestore with geolocation
    return await eventsGeoCollection.add({
      ...eventDetails,
      // The coordinates field is required for geolocation queries
      coordinates: new firebase.firestore.GeoPoint(latitude, longitude)
    });
  } catch (error) {
    console.error('Error adding geo event:', error);
    throw error;
  }
};

export { eventsGeoCollection, postsGeoCollection };