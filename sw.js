const CACHE_NAME = 'focus-flow-v7';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.v2.css',
    './script.v2.js',
    './rain_sound.js',
    './manifest.json',
    './icon.png'
];

// Install Event: Cache core assets & Force Activate
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching app shell');
                // Use map to catch individual failures if an asset is missing
                return Promise.all(
                    ASSETS_TO_CACHE.map(url => {
                        return cache.add(url).catch(err => console.warn(`Failed to cache: ${url}`, err));
                    })
                );
            })
    );
});

// Activate Event: Clean up old caches & Claim Clients
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[Service Worker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
            .then(() => self.clients.claim()) // Take control of all open clients
    );
});

// Fetch Event: Stale-while-revalidate strategy
// This serves cached content immediately, while updating the cache in the background
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((response) => {
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    // Update the cache with the new response
                    if (networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => {
                    // Network failed. If we have a cached response, great.
                    // If not, we might be offline newly.
                    console.log('[Service Worker] Fetch failed, returning cache if available');
                });

                // Return the cached response immediately if available, 
                // otherwise wait for the network response.
                return response || fetchPromise;
            });
        })
    );
});
