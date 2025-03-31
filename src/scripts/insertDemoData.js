import { connectToDatabase, getCollection } from '../config/mongodb.js';

async function insertDemoData() {
  try {
    // Connect to the database
    await connectToDatabase();

    // Insert demo data into the users collection
    const usersCollection = getCollection('users');
    await usersCollection.insertOne({
      id: 'user1',
      name: 'John Doe',
      email: 'john.doe@example.com',
      societyId: 'society1',
    });

    // Insert demo data into the posts collection
    const postsCollection = getCollection('posts');
    await postsCollection.insertOne({
      id: 'post1',
      title: 'Welcome to Neighborly!',
      content: 'This is a demo post.',
      societyId: 'society1',
      authorId: 'user1',
    });

    // Insert demo data into the tournaments collection
    const tournamentsCollection = getCollection('tournaments');
    await tournamentsCollection.insertOne({
      id: 'tournament1',
      name: 'Neighborly Chess Tournament',
      date: '2023-12-01',
      participants: ['user1'],
    });

    console.log('Demo data inserted successfully!');
  } catch (error) {
    console.error('Error inserting demo data:', error);
  }
}

insertDemoData();