const DATABASE_NAME = "moment-storage";
const IMAGE_STORE_NAME = "memory-images";
const SAMPLE_MEMORY_IDS = new Set(["sample-1", "sample-2", "sample-3"]);

export function loadList(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function saveList(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadMemoryMetadata() {
  return loadList("moment_memories", []).filter(memory => !SAMPLE_MEMORY_IDS.has(memory.id));
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(IMAGE_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestValue(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionResult(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function restoreMemoryImages(memories) {
  if (typeof indexedDB === "undefined") return memories;

  let database;

  try {
    database = await openDatabase();
    const transaction = database.transaction(IMAGE_STORE_NAME, "readwrite");
    const finished = transactionResult(transaction);
    const imageStore = transaction.objectStore(IMAGE_STORE_NAME);
    const hydrated = await Promise.all(memories.map(memory => {
      if (memory.image) {
        imageStore.put(memory.image, memory.id);
        return memory;
      }

      return requestValue(imageStore.get(memory.id))
        .then(image => ({ ...memory, image: image || "" }))
        .catch(() => ({ ...memory, image: "" }));
    }));

    await finished;
    return hydrated;
  } finally {
    database?.close();
  }
}

export async function persistMemories(memories) {
  const metadata = memories.map(memory => {
    const savedMemory = { ...memory };
    delete savedMemory.image;
    return savedMemory;
  });

  if (typeof indexedDB === "undefined") {
    return saveList("moment_memories", memories);
  }

  let database;

  try {
    database = await openDatabase();
    const transaction = database.transaction(IMAGE_STORE_NAME, "readwrite");
    const finished = transactionResult(transaction);
    const imageStore = transaction.objectStore(IMAGE_STORE_NAME);
    const memoryIds = new Set(memories.map(memory => memory.id));

    for (const memory of memories) {
      if (memory.image) imageStore.put(memory.image, memory.id);
      else imageStore.delete(memory.id);
    }

    const storedKeys = imageStore.getAllKeys();
    storedKeys.onsuccess = () => {
      for (const key of storedKeys.result) {
        if (!memoryIds.has(key)) imageStore.delete(key);
      }
    };

    await finished;

    if (saveList("moment_memories", metadata)) return true;
    return saveList("moment_memories", memories);
  } catch {
    return saveList("moment_memories", memories);
  } finally {
    database?.close();
  }
}