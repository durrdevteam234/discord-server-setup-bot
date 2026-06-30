const mongoose = require('mongoose');

// Generic schema: each "fileName" (e.g. 'levels.json') becomes its own
// MongoDB collection. Each top-level key in your old JSON object becomes
// one document, identified by _id.
const genericSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // the old JSON object's key (e.g. userId)
    value: { type: mongoose.Schema.Types.Mixed, required: true }, // the old JSON object's value
  },
  { collection: undefined, strict: false } // collection name set dynamically per file
);

// Cache models per "fileName" so we don't redefine them repeatedly
const modelCache = {};

function getModel(fileName) {
  // Strip .json extension to get a clean collection name, e.g. "levels.json" -> "levels"
  const collectionName = fileName.replace(/\.json$/i, '');
  if (!modelCache[collectionName]) {
    modelCache[collectionName] = mongoose.model(
      collectionName,
      genericSchema,
      collectionName // explicit collection name, so it matches what mydata.js lists
    );
  }
  return modelCache[collectionName];
}

// Reads all documents for a given "fileName" and reconstructs the old
// { key: value, key2: value2 } object shape your bot code expects.
async function readData(fileName) {
  try {
    const Model = getModel(fileName);
    const docs = await Model.find().lean();
    const result = {};
    for (const doc of docs) {
      result[doc._id] = doc.value;
    }
    return result;
  } catch (error) {
    console.error(`Error reading ${fileName} from MongoDB, resetting data:`, error.message);
    return {};
  }
}

// Writes an entire { key: value, ... } object back to MongoDB,
// upserting each key as its own document.
async function writeData(fileName, data) {
  try {
    const Model = getModel(fileName);
    const keys = Object.keys(data);

    // Upsert every key/value pair
    const bulkOps = keys.map((key) => ({
      updateOne: {
        filter: { _id: key },
        update: { $set: { value: data[key] } },
        upsert: true,
      },
    }));

    if (bulkOps.length > 0) {
      await Model.bulkWrite(bulkOps);
    }

    // Remove any documents whose keys no longer exist in the new data
    // (mirrors fully overwriting the old JSON file)
    await Model.deleteMany({ _id: { $nin: keys } });
  } catch (error) {
    console.error(`Error writing to ${fileName} in MongoDB:`, error.message);
  }
}

module.exports = { readData, writeData };