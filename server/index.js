import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient, ObjectId } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 5000;
const dbName = process.env.DB_NAME || 'quanlyhang';
const collectionName = process.env.COLLECTION_NAME || 'products';
const uri = process.env.MONGODB_URI ||
  `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@<cluster-host>/${dbName}?retryWrites=true&w=majority`;

if (!process.env.MONGODB_URI && (!process.env.DB_USERNAME || !process.env.DB_PASSWORD)) {
  console.warn('Warning: MongoDB credentials are missing. Set MONGODB_URI or DB_USERNAME and DB_PASSWORD in server/.env');
}

const mongoClient = new MongoClient(uri);
let productsCollection = null;

async function startDatabase() {
  await mongoClient.connect();
  const db = mongoClient.db(dbName);
  productsCollection = db.collection(collectionName);
  console.log(`Connected to MongoDB database= ${dbName}, collection= ${collectionName}`);
}

function ensureCollectionReady(req, res, next) {
  if (!productsCollection) {
    return res.status(503).json({
      error: 'Database is not ready yet. Please wait a moment and try again.',
    });
  }
  next();
}

async function startServer() {
  try {
    await startDatabase();
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (err) {
    console.error('MongoDB connection failed:', err);
    process.exit(1);
  }
}

startServer();

const parseId = (id) => {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
};

app.get('/api/products', ensureCollectionReady, async (req, res) => {
  const products = await productsCollection.find({}).toArray();
  res.json(products);
});

app.get('/api/products/:id', ensureCollectionReady, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid product id' });

  const product = await productsCollection.findOne({ _id: id });
  if (!product) return res.status(404).json({ error: 'Product not found' });

  res.json(product);
});

app.post('/api/products', ensureCollectionReady, async (req, res) => {
  const payload = req.body;
  const result = await productsCollection.insertOne(payload);
  res.status(201).json({ insertedId: result.insertedId });
});

app.put('/api/products/:id', ensureCollectionReady, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid product id' });

  const result = await productsCollection.updateOne(
    { _id: id },
    { $set: req.body }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({ error: 'Product not found' });
  }

  res.json({ matchedCount: result.matchedCount, modifiedCount: result.modifiedCount });
});

app.delete('/api/products/:id', ensureCollectionReady, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid product id' });

  const result = await productsCollection.deleteOne({ _id: id });
  if (result.deletedCount === 0) {
    return res.status(404).json({ error: 'Product not found' });
  }

  res.json({ deletedCount: result.deletedCount });
});

app.get('/', (req, res) => {
  res.send('MongoDB backend is running');
});
